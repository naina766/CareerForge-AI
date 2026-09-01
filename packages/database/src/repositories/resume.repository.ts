import { prisma } from '../client.js';
import { Resume, ResumeProcessingStatus } from '@prisma/client';

export class ResumeRepository {
  static async findById(id: string) {
    return prisma.resume.findUnique({
      where: { id },
      include: {
        candidate: true,
        resumeSkills: {
          include: { skill: true },
        },
        chunks: true,
      },
    });
  }

  static async listByCandidate(candidateId: string): Promise<Resume[]> {
    return prisma.resume.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        resumeSkills: {
          include: { skill: true },
        },
      },
    });
  }

  static async updateStatus(id: string, processingStatus: ResumeProcessingStatus): Promise<Resume> {
    return prisma.resume.update({
      where: { id },
      data: { processingStatus },
    });
  }

  static async count(): Promise<number> {
    return prisma.resume.count();
  }
}
