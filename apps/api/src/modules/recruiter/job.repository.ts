import { prisma } from '@careerforge/database';
import { JobStatus, Prisma } from '@prisma/client';

export class JobRepository {
  /**
   * Creates a job with nested skill associations within a transaction.
   */
  static async create(data: Prisma.JobCreateInput) {
    return prisma.job.create({
      data,
      include: {
        jobSkills: {
          include: {
            skill: true,
          },
        },
        recruiter: true,
      },
    });
  }

  /**
   * Finds a single job by unique ID with skill relationships.
   */
  static async findById(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: {
        jobSkills: {
          include: {
            skill: true,
          },
        },
        recruiter: true,
      },
    });
  }

  /**
   * Finds a single job by slug.
   */
  static async findBySlug(slug: string) {
    return prisma.job.findUnique({
      where: { slug },
      include: {
        jobSkills: {
          include: {
            skill: true,
          },
        },
        recruiter: true,
      },
    });
  }

  /**
   * Lists recruiter jobs with filtering, search, pagination, and sorting.
   */
  static async findByRecruiter(
    recruiterId: string,
    options: {
      status?: JobStatus;
      search?: string;
      page: number;
      limit: number;
      sort: string;
      order: 'asc' | 'desc';
    }
  ) {
    const where: Prisma.JobWhereInput = {
      recruiterId,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.search && options.search.trim()) {
      where.OR = [
        { title: { contains: options.search.trim(), mode: 'insensitive' } },
        { description: { contains: options.search.trim(), mode: 'insensitive' } },
        { location: { contains: options.search.trim(), mode: 'insensitive' } },
      ];
    }

    const skip = (options.page - 1) * options.limit;
    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [options.sort]: options.order,
    };

    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: options.limit,
        orderBy,
        include: {
          jobSkills: {
            include: {
              skill: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  /**
   * Updates job fields and syncs associated skills.
   */
  static async update(
    id: string,
    jobData: Prisma.JobUpdateInput,
    skills?: Array<{ skillId: string; importance: any; minimumYears?: number }>
  ) {
    return prisma.$transaction(async (tx) => {
      if (skills !== undefined) {
        // Replace skills for this job
        await tx.jobSkill.deleteMany({
          where: { jobId: id },
        });

        if (skills.length > 0) {
          await tx.jobSkill.createMany({
            data: skills.map((s) => ({
              jobId: id,
              skillId: s.skillId,
              importance: s.importance,
              minimumYears: s.minimumYears,
              required: s.importance === 'REQUIRED',
            })),
          });
        }
      }

      return tx.job.update({
        where: { id },
        data: jobData,
        include: {
          jobSkills: {
            include: {
              skill: true,
            },
          },
          recruiter: true,
        },
      });
    });
  }

  /**
   * Updates job status and audit timestamp.
   */
  static async updateStatus(
    id: string,
    status: JobStatus,
    extraTimestamps: { publishedAt?: Date; closedAt?: Date; archivedAt?: Date } = {}
  ) {
    return prisma.job.update({
      where: { id },
      data: {
        status,
        ...extraTimestamps,
      },
      include: {
        jobSkills: {
          include: {
            skill: true,
          },
        },
        recruiter: true,
      },
    });
  }

  /**
   * Checks if a slug is already taken by another job.
   */
  static async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.job.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!existing;
  }

  /**
   * Computes dashboard statistics for a recruiter's job postings.
   */
  static async getStats(recruiterId: string) {
    const [total, published, drafts, paused, closed, archived] = await Promise.all([
      prisma.job.count({ where: { recruiterId } }),
      prisma.job.count({ where: { recruiterId, status: { in: ['PUBLISHED', 'ACTIVE'] } } }),
      prisma.job.count({ where: { recruiterId, status: 'DRAFT' } }),
      prisma.job.count({ where: { recruiterId, status: 'PAUSED' } }),
      prisma.job.count({ where: { recruiterId, status: 'CLOSED' } }),
      prisma.job.count({ where: { recruiterId, status: 'ARCHIVED' } }),
    ]);

    return {
      totalJobs: total,
      published,
      drafts,
      paused,
      closed,
      archived,
    };
  }
}
