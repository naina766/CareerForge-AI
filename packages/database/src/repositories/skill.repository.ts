import { prisma } from '../client.js';
import { Skill, SkillCategory } from '@prisma/client';

export class SkillRepository {
  static async findByName(name: string): Promise<Skill | null> {
    return prisma.skill.findUnique({
      where: { name },
    });
  }

  static async list(params?: { category?: SkillCategory; take?: number }): Promise<Skill[]> {
    return prisma.skill.findMany({
      where: params?.category ? { category: params.category } : undefined,
      take: params?.take,
      orderBy: { name: 'asc' },
    });
  }

  static async count(): Promise<number> {
    return prisma.skill.count();
  }
}
