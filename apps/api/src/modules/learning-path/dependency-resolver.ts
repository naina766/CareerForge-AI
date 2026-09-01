import { prisma } from '@careerforge/database';

export interface SkillNode {
  skillId: string;
  skillName: string;
  priorityScore: number;
}

export class DependencyResolver {
  /**
   * Performs topological sort on missing skills using database prerequisite relationships.
   * Ensures foundational skills (e.g. JavaScript) precede dependent skills (e.g. Node.js -> Express).
   * Robust against circular dependencies.
   */
  static async resolveLearningOrder(missingSkills: SkillNode[]): Promise<SkillNode[]> {
    if (missingSkills.length <= 1) {
      return [...missingSkills];
    }

    const skillIdSet = new Set(missingSkills.map((s) => s.skillId));
    const skillMap = new Map<string, SkillNode>(missingSkills.map((s) => [s.skillId, s]));

    // Fetch prerequisite dependencies among the missing skills
    const dependencies = await prisma.skillDependency.findMany({
      where: {
        prerequisiteSkillId: { in: Array.from(skillIdSet) },
        dependentSkillId: { in: Array.from(skillIdSet) },
      },
    });

    // Build Graph: adjList[prereq] = list of dependents
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const skill of missingSkills) {
      inDegree.set(skill.skillId, 0);
      adjList.set(skill.skillId, []);
    }

    for (const dep of dependencies) {
      if (dep.prerequisiteSkillId !== dep.dependentSkillId) {
        adjList.get(dep.prerequisiteSkillId)?.push(dep.dependentSkillId);
        inDegree.set(dep.dependentSkillId, (inDegree.get(dep.dependentSkillId) || 0) + 1);
      }
    }

    // Kahn's Algorithm for Topological Sort
    // Tie-break nodes with 0 inDegree by priorityScore descending
    const queue: SkillNode[] = missingSkills
      .filter((s) => (inDegree.get(s.skillId) || 0) === 0)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const sortedOrder: SkillNode[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      sortedOrder.push(current);
      visited.add(current.skillId);

      const neighbors = adjList.get(current.skillId) || [];
      for (const neighborId of neighbors) {
        const remainingInDegree = (inDegree.get(neighborId) || 1) - 1;
        inDegree.set(neighborId, remainingInDegree);

        if (remainingInDegree === 0) {
          const neighborNode = skillMap.get(neighborId);
          if (neighborNode && !visited.has(neighborId)) {
            queue.push(neighborNode);
            // Re-sort queue by priority score
            queue.sort((a, b) => b.priorityScore - a.priorityScore);
          }
        }
      }
    }

    // Cycle safety: If any nodes were not visited due to cycles, append remaining sorted by priorityScore
    if (sortedOrder.length < missingSkills.length) {
      const remaining = missingSkills
        .filter((s) => !visited.has(s.skillId))
        .sort((a, b) => b.priorityScore - a.priorityScore);
      sortedOrder.push(...remaining);
    }

    return sortedOrder;
  }
}
