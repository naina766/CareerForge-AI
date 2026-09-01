import { prisma } from '../client.js';
import { Prisma } from '@prisma/client';

export class CandidateRepository {
  static async findByUserId(userId: string) {
    return prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        skills: {
          include: { skill: true },
          orderBy: { createdAt: 'asc' },
        },
        experiences: {
          orderBy: { startDate: 'desc' },
        },
        educations: {
          orderBy: { startDate: 'desc' },
        },
        preferences: true,
      },
    });
  }

  static async findById(id: string) {
    return prisma.candidateProfile.findUnique({
      where: { id },
      include: {
        skills: {
          include: { skill: true },
          orderBy: { createdAt: 'asc' },
        },
        experiences: {
          orderBy: { startDate: 'desc' },
        },
        educations: {
          orderBy: { startDate: 'desc' },
        },
        preferences: true,
      },
    });
  }

  static async createProfile(data: Prisma.CandidateProfileCreateInput) {
    return prisma.candidateProfile.create({
      data,
      include: {
        skills: { include: { skill: true } },
        experiences: true,
        educations: true,
        preferences: true,
      },
    });
  }

  static async updateProfile(userId: string, data: Prisma.CandidateProfileUpdateInput) {
    return prisma.candidateProfile.update({
      where: { userId },
      data,
      include: {
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { startDate: 'desc' } },
        preferences: true,
      },
    });
  }

  static async deleteProfile(userId: string) {
    return prisma.candidateProfile.delete({
      where: { userId },
    });
  }
}
