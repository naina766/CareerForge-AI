import { prisma } from '@careerforge/database';
import { Prisma, WorkMode, EmploymentType } from '@prisma/client';
import { CandidateJobSearchInput } from './job-discovery.schema.js';
import { SkillService } from '../skill/skill.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export class JobDiscoveryService {
  /**
   * Searches and filters published, active, non-expired jobs for candidate discovery.
   */
  static async searchPublishedJobs(input: CandidateJobSearchInput) {
    const now = new Date();
    const whereConditions: Prisma.JobWhereInput[] = [
      // 1. Strictly published / active
      { status: { in: ['PUBLISHED', 'ACTIVE'] } },
      // 2. Expiration rule: Not expired
      {
        OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: now } }],
      },
    ];

    // 3. Keyword Search
    if (input.search && input.search.trim()) {
      const q = input.search.trim();
      whereConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { responsibilities: { contains: q, mode: 'insensitive' } },
          { requirements: { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    // 4. Work Mode Filter
    if (input.workMode && input.workMode.length > 0) {
      whereConditions.push({
        workMode: { in: input.workMode as WorkMode[] },
      });
    }

    // 5. Employment Type Filter
    if (input.employmentType && input.employmentType.length > 0) {
      whereConditions.push({
        employmentType: { in: input.employmentType as EmploymentType[] },
      });
    }

    // 6. Location Filter
    if (input.location && input.location.trim()) {
      const loc = input.location.trim();
      whereConditions.push({
        OR: [
          { location: { contains: loc, mode: 'insensitive' } },
          { city: { contains: loc, mode: 'insensitive' } },
          { state: { contains: loc, mode: 'insensitive' } },
          { country: { contains: loc, mode: 'insensitive' } },
        ],
      });
    }

    // 7. Experience Filter Overlap Logic
    if (input.experienceMin !== undefined || input.experienceMax !== undefined) {
      if (input.experienceMax !== undefined) {
        whereConditions.push({
          experienceMin: { lte: input.experienceMax },
        });
      }
      if (input.experienceMin !== undefined) {
        whereConditions.push({
          OR: [{ experienceMax: null }, { experienceMax: { gte: input.experienceMin } }],
        });
      }
    }

    // 8. Salary Filter Logic
    if (input.salaryMin !== undefined) {
      whereConditions.push({
        OR: [
          { salaryMin: { gte: input.salaryMin } },
          { salaryMax: { gte: input.salaryMin } },
        ],
      });
    }

    if (input.salaryMax !== undefined) {
      whereConditions.push({
        OR: [
          { salaryMin: { lte: input.salaryMax } },
          { salaryMax: { lte: input.salaryMax } },
        ],
      });
    }

    // 9. Canonical Skill Normalization & Filtering
    if (input.skills && input.skills.length > 0) {
      const canonicalSkillIds: string[] = [];

      for (const rawSkill of input.skills) {
        const resolved = await SkillService.resolveSkill(rawSkill);
        if (resolved.canonicalSkillId) {
          canonicalSkillIds.push(resolved.canonicalSkillId);
        } else {
          // If skill is not yet in taxonomy, try finding skill by name or normalized name
          const found = await prisma.skill.findFirst({
            where: {
              OR: [
                { name: { equals: rawSkill, mode: 'insensitive' } },
                { slug: { equals: rawSkill.toLowerCase().trim() } },
              ],
            },
          });
          if (found) {
            canonicalSkillIds.push(found.id);
          }
        }
      }

      if (canonicalSkillIds.length > 0) {
        if (input.skillMatch === 'all') {
          // Job must contain ALL requested skills
          whereConditions.push({
            AND: canonicalSkillIds.map((skillId) => ({
              jobSkills: {
                some: { skillId },
              },
            })),
          });
        } else {
          // Job may contain ANY of the requested skills
          whereConditions.push({
            jobSkills: {
              some: {
                skillId: { in: canonicalSkillIds },
              },
            },
          });
        }
      }
    }

    const where: Prisma.JobWhereInput = {
      AND: whereConditions,
    };

    // 10. Sorting
    let orderBy: Prisma.JobOrderByWithRelationInput | Prisma.JobOrderByWithRelationInput[];
    switch (input.sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'deadline':
        orderBy = [{ applicationDeadline: 'asc' }, { createdAt: 'desc' }];
        break;
      case 'salary':
        orderBy = [{ salaryMin: 'desc' }, { salaryMax: 'desc' }];
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // 11. Pagination
    const skip = (input.page - 1) * input.limit;
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: input.limit,
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

    const totalPages = Math.ceil(total / input.limit) || 1;

    const formattedItems = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      slug: job.slug,
      companyName: job.companyName,
      location: job.location,
      city: job.city,
      state: job.state,
      country: job.country,
      workMode: job.workMode,
      employmentType: job.employmentType,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      salaryPeriod: job.salaryPeriod,
      applicationDeadline: job.applicationDeadline ? job.applicationDeadline.toISOString() : null,
      publishedAt: job.publishedAt ? job.publishedAt.toISOString() : null,
      skills: (job.jobSkills || []).map((js) => ({
        id: js.skillId,
        name: js.skill?.name || 'Skill',
        importance: js.importance,
        required: js.required,
        minimumYears: js.minimumYears,
      })),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    }));

    return {
      items: formattedItems,
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages,
        hasNextPage: input.page < totalPages,
        hasPreviousPage: input.page > 1,
      },
    };
  }

  /**
   * Retrieves single public job details by slug or unique ID.
   */
  static async getPublicJobBySlugOrId(slugOrId: string) {
    const job = await prisma.job.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        status: { in: ['PUBLISHED', 'ACTIVE'] },
      },
      include: {
        jobSkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!job) {
      throw new AppError('Job posting not found or is no longer active', 404, 'JOB_NOT_FOUND');
    }

    return {
      id: job.id,
      title: job.title,
      slug: job.slug,
      companyName: job.companyName,
      location: job.location,
      city: job.city,
      state: job.state,
      country: job.country,
      workMode: job.workMode,
      employmentType: job.employmentType,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      salaryPeriod: job.salaryPeriod,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      benefits: job.benefits,
      status: job.status,
      applicationDeadline: job.applicationDeadline ? job.applicationDeadline.toISOString() : null,
      publishedAt: job.publishedAt ? job.publishedAt.toISOString() : null,
      skills: (job.jobSkills || []).map((js) => ({
        id: js.skillId,
        name: js.skill?.name || 'Skill',
        importance: js.importance,
        required: js.required,
        minimumYears: js.minimumYears,
      })),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
