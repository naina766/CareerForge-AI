import { prisma } from '../client.js';
import { MatchReport, Prisma } from '@prisma/client';

export class MatchReportRepository {
  static async findById(id: string): Promise<MatchReport | null> {
    return prisma.matchReport.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
      },
    });
  }

  static async findByCandidateAndJob(candidateId: string, jobId: string): Promise<MatchReport | null> {
    return prisma.matchReport.findFirst({
      where: { candidateId, jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async listByCandidate(candidateId: string): Promise<MatchReport[]> {
    return prisma.matchReport.findMany({
      where: { candidateId },
      orderBy: { overallScore: 'desc' },
      include: {
        job: true,
      },
    });
  }

  static async count(where?: Prisma.MatchReportWhereInput): Promise<number> {
    return prisma.matchReport.count({ where });
  }
}
