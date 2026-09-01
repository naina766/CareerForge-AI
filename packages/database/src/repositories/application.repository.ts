import { prisma } from '../client.js';
import { Application, ApplicationStatus, Prisma } from '@prisma/client';

export class ApplicationRepository {
  static async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
        resume: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  static async findByCandidateAndJob(candidateId: string, jobId: string): Promise<Application | null> {
    return prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId,
          jobId,
        },
      },
    });
  }

  static async listByCandidate(candidateId: string) {
    return prisma.application.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  static async listByJob(jobId: string, status?: ApplicationStatus) {
    return prisma.application.findMany({
      where: {
        jobId,
        ...(status && { status }),
      },
      orderBy: { matchScore: 'desc' },
      include: {
        candidate: true,
        resume: true,
      },
    });
  }

  static async count(where?: Prisma.ApplicationWhereInput): Promise<number> {
    return prisma.application.count({ where });
  }
}
