import { prisma } from '../client.js';
import { JobStatus, WorkMode, EmploymentType, Prisma } from '@prisma/client';

export class JobRepository {
  static async findById(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: {
        recruiter: true,
        jobSkills: {
          include: { skill: true },
        },
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  static async list(params: {
    skip?: number;
    take?: number;
    status?: JobStatus;
    workMode?: WorkMode;
    employmentType?: EmploymentType;
    location?: string;
  }) {
    const where: Prisma.JobWhereInput = {
      status: params.status ?? JobStatus.ACTIVE,
      ...(params.workMode && { workMode: params.workMode }),
      ...(params.employmentType && { employmentType: params.employmentType }),
      ...(params.location && {
        location: { contains: params.location, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: params.skip,
        take: params.take ?? 20,
        orderBy: { createdAt: 'desc' },
        include: {
          recruiter: true,
          jobSkills: {
            include: { skill: true },
          },
          _count: {
            select: { applications: true },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return { items, total };
  }

  static async count(where?: Prisma.JobWhereInput): Promise<number> {
    return prisma.job.count({ where });
  }
}
