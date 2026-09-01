import { prisma } from '@careerforge/database';
import { ApplicationStatus, Prisma, UserRole } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler.js';
import {
  CreateApplicationInput,
  UpdateApplicationStatusInput,
  ApplicationQueryInput,
} from './application.schema.js';

export const ALLOWED_APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: ['SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  SCREENING: ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEW', 'OFFERED', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['OFFERED', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFERED: ['HIRED', 'REJECTED'],
  OFFER: ['HIRED', 'REJECTED'],
  HIRED: [], // Terminal state
  REJECTED: [], // Terminal state
  WITHDRAWN: [], // Terminal state
};

export class ApplicationService {
  /**
   * Submits a new job application for an authenticated candidate.
   */
  static async createApplication(userId: string, jobId: string, input: CreateApplicationInput) {
    // 1. Validate candidate profile
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!candidate) {
      throw new AppError('Candidate profile not found. Please complete your profile first.', 404, 'CANDIDATE_PROFILE_NOT_FOUND');
    }

    // 2. Validate job existence, status, and deadline
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      throw new AppError('Job vacancy not found', 404, 'JOB_NOT_FOUND');
    }

    if (job.status !== 'PUBLISHED' && job.status !== 'ACTIVE') {
      throw new AppError('This vacancy is not open for public applications', 400, 'JOB_NOT_ACCEPTING_APPLICATIONS');
    }

    if (job.applicationDeadline && job.applicationDeadline < new Date()) {
      throw new AppError('Application deadline for this position has passed', 400, 'APPLICATION_DEADLINE_PASSED');
    }

    // 3. Validate resume ownership & processing status
    const resume = await prisma.resume.findUnique({
      where: { id: input.resumeId },
    });
    if (!resume || resume.candidateId !== candidate.id) {
      throw new AppError('Invalid resume selection. The chosen resume does not belong to your account.', 403, 'INVALID_RESUME_OWNERSHIP');
    }

    if (resume.processingStatus === 'FAILED') {
      throw new AppError('The selected resume failed processing and cannot be attached. Please select another resume.', 400, 'RESUME_PROCESSING_FAILED');
    }

    // 4. Check for duplicate application
    const existing = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
    });
    if (existing) {
      throw new AppError('You have already applied for this position', 409, 'APPLICATION_ALREADY_EXISTS');
    }

    // 5. Execute transactional creation
    return await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          resumeId: resume.id,
          coverLetter: input.coverLetter || null,
          status: ApplicationStatus.APPLIED,
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              companyName: true,
              location: true,
              workMode: true,
              employmentType: true,
            },
          },
          resume: {
            select: {
              id: true,
              originalFileName: true,
              fileUrl: true,
            },
          },
        },
      });

      // Append initial status history
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          oldStatus: null,
          newStatus: ApplicationStatus.APPLIED,
          changedBy: candidate.name,
          changedById: userId,
          changedByRole: UserRole.CANDIDATE,
          note: 'Application submitted by candidate',
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPLICATION_CREATED',
          entityType: 'Application',
          entityId: application.id,
          metadata: {
            jobId: job.id,
            jobTitle: job.title,
            candidateId: candidate.id,
            resumeId: resume.id,
          },
        },
      });

      return application;
    });
  }

  /**
   * Retrieves candidate's submitted applications with pagination, status filter, and summary stats.
   */
  static async getCandidateApplications(userId: string, query: ApplicationQueryInput) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_PROFILE_NOT_FOUND');
    }

    const where: Prisma.ApplicationWhereInput = {
      candidateId: candidate.id,
    };

    if (query.status && query.status !== 'ALL') {
      const statuses = query.status.split(',').map((s) => s.trim().toUpperCase()) as ApplicationStatus[];
      where.status = { in: statuses };
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.job = {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    let orderBy: Prisma.ApplicationOrderByWithRelationInput;
    switch (query.sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'status':
        orderBy = { status: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const skip = (query.page - 1) * query.limit;

    const [applications, total, statsAggregation] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          job: true,
          resume: {
            select: {
              id: true,
              originalFileName: true,
              fileUrl: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.application.count({ where }),
      prisma.application.groupBy({
        by: ['status'],
        where: { candidateId: candidate.id },
        _count: { status: true },
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit) || 1;

    // Calculate aggregated candidate dashboard statistics
    const stats = {
      total: 0,
      active: 0,
      interviews: 0,
      offers: 0,
      hired: 0,
    };

    for (const group of statsAggregation) {
      stats.total += group._count.status;
      if (['APPLIED', 'SCREENING', 'SHORTLISTED'].includes(group.status)) {
        stats.active += group._count.status;
      } else if (group.status === 'INTERVIEW') {
        stats.interviews += group._count.status;
      } else if (group.status === 'OFFERED' || group.status === 'OFFER') {
        stats.offers += group._count.status;
      } else if (group.status === 'HIRED') {
        stats.hired += group._count.status;
      }
    }

    const formattedItems = applications.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job.title,
      slug: app.job.slug,
      companyName: app.job.companyName,
      location: app.job.location,
      workMode: app.job.workMode,
      employmentType: app.job.employmentType,
      salaryMin: app.job.salaryMin,
      salaryMax: app.job.salaryMax,
      currency: app.job.currency,
      salaryPeriod: app.job.salaryPeriod,
      resumeId: app.resumeId,
      resumeName: app.resume.originalFileName,
      status: app.status,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt.toISOString(),
      withdrawnAt: app.withdrawnAt ? app.withdrawnAt.toISOString() : null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      statusHistory: app.statusHistory.map((h) => ({
        id: h.id,
        applicationId: h.applicationId,
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        changedBy: h.changedBy,
        changedById: h.changedById,
        changedByRole: h.changedByRole,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
    }));

    return {
      items: formattedItems,
      stats,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  /**
   * Retrieves single application details with authorization verification.
   */
  static async getApplicationById(userId: string, userRole: string, applicationId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          include: {
            user: {
              select: { id: true, email: true },
            },
            skills: {
              include: { skill: true },
            },
          },
        },
        job: {
          include: {
            recruiter: {
              include: {
                user: { select: { id: true, email: true } },
              },
            },
            jobSkills: {
              include: { skill: true },
            },
          },
        },
        resume: {
          select: {
            id: true,
            originalFileName: true,
            fileUrl: true,
            processingStatus: true,
            createdAt: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    // RBAC Ownership Check
    const isCandidateOwner = application.candidate.userId === userId;
    const isRecruiterOwner = application.job.recruiter.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isCandidateOwner && !isRecruiterOwner && !isAdmin) {
      throw new AppError('You are not authorized to view this application', 403, 'UNAUTHORIZED_APPLICATION_ACCESS');
    }

    return {
      id: application.id,
      candidateId: application.candidateId,
      candidateName: application.candidate.name,
      candidateEmail: isRecruiterOwner || isAdmin ? application.candidate.user.email : undefined,
      candidateHeadline: application.candidate.headline,
      candidateLocation: application.candidate.location,
      candidateExperienceYears: application.candidate.experienceYears,
      candidateSkills: (application.candidate.skills || []).map((cs) => cs.skill.name),
      jobId: application.jobId,
      jobTitle: application.job.title,
      jobSlug: application.job.slug,
      companyName: application.job.companyName,
      jobLocation: application.job.location,
      workMode: application.job.workMode,
      employmentType: application.job.employmentType,
      salaryMin: application.job.salaryMin,
      salaryMax: application.job.salaryMax,
      currency: application.job.currency,
      salaryPeriod: application.job.salaryPeriod,
      jobDescription: application.job.description,
      jobResponsibilities: application.job.responsibilities,
      jobRequirements: application.job.requirements,
      jobSkills: (application.job.jobSkills || []).map((js) => ({
        name: js.skill.name,
        importance: js.importance,
        required: js.required,
      })),
      resumeId: application.resumeId,
      resumeName: application.resume.originalFileName,
      resumeFileUrl: application.resume.fileUrl,
      coverLetter: application.coverLetter,
      status: application.status,
      appliedAt: application.appliedAt.toISOString(),
      withdrawnAt: application.withdrawnAt ? application.withdrawnAt.toISOString() : null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      statusHistory: application.statusHistory.map((h) => ({
        id: h.id,
        applicationId: h.applicationId,
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        changedBy: h.changedBy,
        changedById: h.changedById,
        changedByRole: h.changedByRole,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Candidate withdraws their active application.
   */
  static async withdrawApplication(userId: string, applicationId: string) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_PROFILE_NOT_FOUND');
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!application || application.candidateId !== candidate.id) {
      throw new AppError('Application not found or unauthorized', 404, 'APPLICATION_NOT_FOUND');
    }

    if (application.status === 'WITHDRAWN') {
      throw new AppError('This application has already been withdrawn', 400, 'APPLICATION_ALREADY_WITHDRAWN');
    }

    if (['HIRED', 'REJECTED'].includes(application.status)) {
      throw new AppError(`Cannot withdraw application in ${application.status} status`, 400, 'INVALID_WITHDRAW_STATUS');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.WITHDRAWN,
          withdrawnAt: new Date(),
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          oldStatus: application.status,
          newStatus: ApplicationStatus.WITHDRAWN,
          changedBy: candidate.name,
          changedById: userId,
          changedByRole: UserRole.CANDIDATE,
          note: 'Application withdrawn by candidate',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPLICATION_WITHDRAWN',
          entityType: 'Application',
          entityId: application.id,
          metadata: {
            previousStatus: application.status,
            jobId: application.jobId,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Retrieves applications for a recruiter's job posting (Kanban / Table view).
   */
  static async getRecruiterJobApplications(userId: string, userRole: string, jobId: string, query: ApplicationQueryInput) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { recruiter: true },
    });
    if (!job) {
      throw new AppError('Job vacancy not found', 404, 'JOB_NOT_FOUND');
    }

    if (userRole !== 'ADMIN' && job.recruiter.userId !== userId) {
      throw new AppError('You do not have permission to view applications for this job', 403, 'UNAUTHORIZED_RECRUITER_ACCESS');
    }

    const where: Prisma.ApplicationWhereInput = {
      jobId: job.id,
    };

    if (query.status && query.status !== 'ALL') {
      const statuses = query.status.split(',').map((s) => s.trim().toUpperCase()) as ApplicationStatus[];
      where.status = { in: statuses };
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.candidate = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { headline: { contains: q, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
        ],
      };
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          candidate: {
            include: {
              user: { select: { email: true } },
              skills: { include: { skill: true } },
            },
          },
          resume: {
            select: {
              id: true,
              originalFileName: true,
              fileUrl: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    const formattedItems = applications.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      jobTitle: job.title,
      candidateId: app.candidateId,
      candidateName: app.candidate.name,
      candidateEmail: app.candidate.user.email,
      candidateHeadline: app.candidate.headline,
      candidateLocation: app.candidate.location,
      skills: (app.candidate.skills || []).map((cs) => cs.skill.name),
      experienceYears: app.candidate.experienceYears,
      resumeId: app.resumeId,
      resumeName: app.resume.originalFileName,
      resumeFileUrl: app.resume.fileUrl,
      status: app.status,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt.toISOString(),
      withdrawnAt: app.withdrawnAt ? app.withdrawnAt.toISOString() : null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      statusHistory: app.statusHistory.map((h) => ({
        id: h.id,
        applicationId: h.applicationId,
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        changedBy: h.changedBy,
        changedById: h.changedById,
        changedByRole: h.changedByRole,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
    }));

    return {
      items: formattedItems,
      total,
    };
  }

  /**
   * Recruiter updates the lifecycle status of an application.
   */
  static async updateApplicationStatus(
    userId: string,
    userRole: string,
    applicationId: string,
    input: UpdateApplicationStatusInput
  ) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: { recruiter: true },
        },
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    if (userRole !== 'ADMIN' && application.job.recruiter.userId !== userId) {
      throw new AppError('You do not have permission to manage this application', 403, 'UNAUTHORIZED_RECRUITER_ACCESS');
    }

    // Transition Validation
    const currentStatus = application.status;
    const targetStatus = input.status as ApplicationStatus;

    if (currentStatus === targetStatus) {
      return application;
    }

    const allowed = ALLOWED_APPLICATION_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${targetStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: targetStatus,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          oldStatus: currentStatus,
          newStatus: targetStatus,
          changedBy: application.job.recruiter.name,
          changedById: userId,
          changedByRole: userRole === 'ADMIN' ? UserRole.ADMIN : UserRole.RECRUITER,
          note: input.note || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPLICATION_STATUS_UPDATED',
          entityType: 'Application',
          entityId: application.id,
          metadata: {
            oldStatus: currentStatus,
            newStatus: targetStatus,
            note: input.note,
          },
        },
      });

      return updated;
    });
  }
}
