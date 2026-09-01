import { prisma } from '@careerforge/database';
import { LearningResourceItem } from '@careerforge/types';

export class ResourceSelector {
  /**
   * Retrieves approved database learning resources for a list of skill IDs.
   * Guaranteed to only return active resources cataloged in PostgreSQL (no hallucinations).
   */
  static async selectResourcesForSkills(
    skillIds: string[]
  ): Promise<Map<string, LearningResourceItem | null>> {
    const validSkillIds = skillIds.filter(Boolean);
    const resultMap = new Map<string, LearningResourceItem | null>();

    if (validSkillIds.length === 0) {
      return resultMap;
    }

    const resources = await prisma.learningResource.findMany({
      where: {
        skillId: { in: validSkillIds },
        isActive: true,
      },
      orderBy: [{ difficulty: 'asc' }, { estimatedHours: 'asc' }],
    });

    for (const skillId of validSkillIds) {
      const match = resources.find((r) => r.skillId === skillId);
      if (match) {
        resultMap.set(skillId, {
          id: match.id,
          title: match.title,
          description: match.description,
          provider: match.provider,
          url: match.url,
          skillId: match.skillId,
          resourceType: match.resourceType as any,
          difficulty: match.difficulty as any,
          estimatedHours: match.estimatedHours,
          isActive: match.isActive,
        });
      } else {
        resultMap.set(skillId, null);
      }
    }

    return resultMap;
  }
}
