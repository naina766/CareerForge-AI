import { prisma } from '@careerforge/database';
import { JobStatus, SkillImportance } from '@prisma/client';
import { JobRepository } from './job.repository.js';
import { CreateJobInput, JobListQueryInput, UpdateJobInput } from './job.schema.js';
import { SkillService } from '../skill/skill.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

// Centralized Status Transition State Machine
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ['PUBLISHED', 'ACTIVE', 'ARCHIVED'],
  PUBLISHED: ['PAUSED', 'CLOSED'],
  ACTIVE: ['PAUSED', 'CLOSED'],
  PAUSED: ['PUBLISHED', 'ACTIVE', 'CLOSED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

export class JobService {
  /**
   * Helper to retrieve or create the recruiter profile for the authenticated user.
   */
  static async getRecruiterProfile(userId: string) {
    let profile = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Auto-provision empty recruiter profile if not yet created
      profile = await prisma.recruiterProfile.create({
        data: {
          userId,
          name: 'Hiring Manager',
          companyName: 'CareerForge Partner',
          jobTitle: 'Recruiter',
        },
      });
    }

    return profile;
  }

  /**
   * Generates a URL-safe, unique slug from the title and company.
   */
  static async generateUniqueSlug(title: string, company: string, excludeJobId?: string): Promise<string> {
    const raw = `${title} ${company}`
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    let baseSlug = raw.slice(0, 80) || 'job-posting';
    let candidateSlug = baseSlug;
    let counter = 1;

    while (await JobRepository.isSlugTaken(candidateSlug, excludeJobId)) {
      counter++;
      candidateSlug = `${baseSlug}-${counter}`;
    }

    return candidateSlug;
  }

  /**
   * Resolves raw skill inputs into canonical taxonomy IDs and deduplicates them.
   */
  private static async resolveAndDeduplicateSkills(
    skillsInput: Array<{ name: string; importance?: string; minimumYears?: number }>
  ): Promise<Array<{ skillId: string; importance: SkillImportance; minimumYears?: number }>> {
    const canonicalMap = new Map<string, { skillId: string; importance: SkillImportance; minimumYears?: number }>();

    for (const item of skillsInput) {
      if (!item.name || !item.name.trim()) continue;

      const resolved = await SkillService.resolveSkill(item.name);
      let skillId = resolved.canonicalSkillId;

      if (!skillId) {
        // Create canonical skill if not present
        const created = await prisma.skill.create({
          data: {
            name: item.name.trim(),
            slug: item.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-'),
            category: 'OTHER',
          },
        });
        skillId = created.id;
      }

      const importance = (item.importance === 'PREFERRED' ? 'PREFERRED' : 'REQUIRED') as SkillImportance;

      // Deduplicate by canonical skillId (if already added with REQUIRED, preserve REQUIRED)
      if (!canonicalMap.has(skillId) || importance === 'REQUIRED') {
        canonicalMap.set(skillId, {
          skillId,
          importance,
          minimumYears: item.minimumYears,
        });
      }
    }

    return Array.from(canonicalMap.values());
  }

  /**
   * Creates a new job posting for the recruiter.
   */
  static async createJob(userId: string, input: CreateJobInput) {
    const recruiter = await this.getRecruiterProfile(userId);
    const companyName = input.companyName || recruiter.companyName || 'CareerForge Partner';

    const slug = await this.generateUniqueSlug(input.title, companyName);
    const resolvedSkills = await this.resolveAndDeduplicateSkills(input.skills || []);

    const status = input.status || 'DRAFT';
    const publishedAt = status === 'PUBLISHED' || status === 'ACTIVE' ? new Date() : null;

    const job = await JobRepository.create({
      recruiter: { connect: { id: recruiter.id } },
      title: input.title,
      slug,
      description: input.description,
      responsibilities: input.responsibilities,
      requirements: input.requirements,
      benefits: input.benefits,
      companyName,
      location: input.location || 'Remote',
      city: input.city,
      state: input.state,
      country: input.country,
      workMode: input.workMode,
      employmentType: input.employmentType,
      experienceMin: input.experienceMin,
      experienceMax: input.experienceMax,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      currency: input.currency,
      salaryPeriod: input.salaryPeriod,
      status,
      applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
      publishedAt,
      jobSkills: {
        create: resolvedSkills.map((s) => ({
          skillId: s.skillId,
          importance: s.importance,
          minimumYears: s.minimumYears,
          required: s.importance === 'REQUIRED',
        })),
      },
    });

    // Audit Logging
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: job.id,
        metadata: { title: job.title, status: job.status, slug: job.slug },
      },
    });

    logger.info(`Job created: ${job.id} [${job.status}] by recruiter ${recruiter.id}`);
    return job;
  }

  /**
   * Retrieves a single job by ID with recruiter ownership validation.
   */
  static async getJobById(userId: string, jobId: string, userRole: string = 'RECRUITER') {
    const job = await JobRepository.findById(jobId);
    if (!job) {
      throw new AppError('Job posting not found', 404, 'JOB_NOT_FOUND');
    }

    if (userRole === 'RECRUITER') {
      const recruiter = await this.getRecruiterProfile(userId);
      if (job.recruiterId !== recruiter.id) {
        throw new AppError('You do not have permission to access this job', 403, 'FORBIDDEN');
      }
    }

    return job;
  }

  /**
   * Lists all jobs owned by the authenticated recruiter.
   */
  static async listRecruiterJobs(userId: string, query: JobListQueryInput) {
    const recruiter = await this.getRecruiterProfile(userId);

    const statusFilter = query.status === 'ALL' || !query.status ? undefined : (query.status as JobStatus);

    return JobRepository.findByRecruiter(recruiter.id, {
      status: statusFilter,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    });
  }

  /**
   * Updates an existing job posting.
   */
  static async updateJob(userId: string, jobId: string, input: UpdateJobInput) {
    const job = await this.getJobById(userId, jobId);

    let resolvedSkills = undefined;
    if (input.skills !== undefined) {
      resolvedSkills = await this.resolveAndDeduplicateSkills(input.skills);
    }

    let slug = job.slug;
    if (input.title && input.title !== job.title) {
      slug = await this.generateUniqueSlug(input.title, input.companyName || job.companyName, job.id);
    }

    const updatedJob = await JobRepository.update(
      jobId,
      {
        ...(input.title ? { title: input.title, slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.responsibilities !== undefined ? { responsibilities: input.responsibilities } : {}),
        ...(input.requirements !== undefined ? { requirements: input.requirements } : {}),
        ...(input.benefits !== undefined ? { benefits: input.benefits } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.workMode !== undefined ? { workMode: input.workMode } : {}),
        ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
        ...(input.experienceMin !== undefined ? { experienceMin: input.experienceMin } : {}),
        ...(input.experienceMax !== undefined ? { experienceMax: input.experienceMax } : {}),
        ...(input.salaryMin !== undefined ? { salaryMin: input.salaryMin } : {}),
        ...(input.salaryMax !== undefined ? { salaryMax: input.salaryMax } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.salaryPeriod !== undefined ? { salaryPeriod: input.salaryPeriod } : {}),
        ...(input.applicationDeadline !== undefined
          ? { applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null }
          : {}),
      },
      resolvedSkills
    );

    // Audit Logging
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'JOB_UPDATED',
        entityType: 'Job',
        entityId: jobId,
        metadata: { updatedFields: Object.keys(input) },
      },
    });

    return updatedJob;
  }

  /**
   * Updates job status using the strict status transition state machine.
   */
  static async updateJobStatus(userId: string, jobId: string, targetStatus: JobStatus) {
    const job = await this.getJobById(userId, jobId);

    if (job.status === targetStatus) {
      return job;
    }

    const allowed = ALLOWED_TRANSITIONS[job.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `Invalid status transition from ${job.status} to ${targetStatus}. Allowed transitions: [${allowed.join(', ')}]`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const extraTimestamps: { publishedAt?: Date; closedAt?: Date; archivedAt?: Date } = {};
    if ((targetStatus === 'PUBLISHED' || targetStatus === 'ACTIVE') && !job.publishedAt) {
      extraTimestamps.publishedAt = new Date();
    } else if (targetStatus === 'CLOSED') {
      extraTimestamps.closedAt = new Date();
    } else if (targetStatus === 'ARCHIVED') {
      extraTimestamps.archivedAt = new Date();
    }

    const updated = await JobRepository.updateStatus(jobId, targetStatus, extraTimestamps);

    // Audit Logging
    await prisma.auditLog.create({
      data: {
        userId,
        action: `JOB_${targetStatus}` as any,
        entityType: 'Job',
        entityId: jobId,
        metadata: { previousStatus: job.status, newStatus: targetStatus },
      },
    });

    logger.info(`Job ${jobId} transitioned: ${job.status} -> ${targetStatus}`);
    return updated;
  }

  /**
   * Duplicates an existing job as a new DRAFT posting.
   */
  static async duplicateJob(userId: string, jobId: string) {
    const original = await this.getJobById(userId, jobId);
    const recruiter = await this.getRecruiterProfile(userId);

    const duplicateTitle = `${original.title} (Copy)`;
    const slug = await this.generateUniqueSlug(duplicateTitle, original.companyName);

    const duplicated = await JobRepository.create({
      recruiter: { connect: { id: recruiter.id } },
      title: duplicateTitle,
      slug,
      description: original.description,
      responsibilities: original.responsibilities,
      requirements: original.requirements,
      benefits: original.benefits,
      companyName: original.companyName,
      location: original.location,
      city: original.city,
      state: original.state,
      country: original.country,
      workMode: original.workMode,
      employmentType: original.employmentType,
      experienceMin: original.experienceMin,
      experienceMax: original.experienceMax,
      salaryMin: original.salaryMin,
      salaryMax: original.salaryMax,
      currency: original.currency,
      salaryPeriod: original.salaryPeriod,
      status: 'DRAFT',
      applicationDeadline: null,
      publishedAt: null,
      closedAt: null,
      archivedAt: null,
      jobSkills: {
        create: (original.jobSkills || []).map((js) => ({
          skillId: js.skillId,
          importance: js.importance,
          minimumYears: js.minimumYears,
          required: js.required,
        })),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: duplicated.id,
        metadata: { duplicatedFrom: jobId },
      },
    });

    logger.info(`Job duplicated: original ${jobId} -> new draft ${duplicated.id}`);
    return duplicated;
  }

  /**
   * Archives a job posting.
   */
  static async archiveJob(userId: string, jobId: string) {
    return this.updateJobStatus(userId, jobId, 'ARCHIVED');
  }

  /**
   * Gets summary statistics for recruiter jobs.
   */
  static async getRecruiterStats(userId: string) {
    const recruiter = await this.getRecruiterProfile(userId);
    return JobRepository.getStats(recruiter.id);
  }
}
