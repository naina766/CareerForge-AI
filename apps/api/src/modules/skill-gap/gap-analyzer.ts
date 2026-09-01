import {
  GapPriority,
  ReadinessLevel,
  SkillRequirementType,
  SkillGapStatus,
  SkillGapItem,
} from '@careerforge/types';

export interface RawSkillGapInput {
  skillId?: string | null;
  skillName: string;
  requirementType: SkillRequirementType;
  isPrerequisiteToOtherMissing: boolean;
  semanticRelevance?: number; // 0-10
}

export interface ReadinessCalculationInput {
  matchedRequired: number;
  totalRequired: number;
  matchedPreferred: number;
  totalPreferred: number;
}

export class SkillGapAnalyzer {
  /**
   * Deterministic Priority Formula:
   * priorityScore = requiredComponent (50 or 25) + jobRelevance (0-25) + dependencyImportance (0-15) + semanticRelevance (0-10)
   * Maximum score = 100
   * Thresholds:
   *   HIGH   >= 75
   *   MEDIUM = 50 - 74
   *   LOW    < 50
   */
  static evaluateGapItem(input: RawSkillGapInput): SkillGapItem {
    const requiredComponent = input.requirementType === 'REQUIRED' ? 50 : 25;
    const jobRelevance = input.requirementType === 'REQUIRED' ? 20 : 15;
    const dependencyImportance = input.isPrerequisiteToOtherMissing ? 15 : 0;
    const semanticRelevance = Math.min(10, Math.max(0, input.semanticRelevance ?? 5));

    const totalPriorityScore = Math.min(
      100,
      Math.max(0, requiredComponent + jobRelevance + dependencyImportance + semanticRelevance)
    );

    let priority: GapPriority = 'LOW';
    if (totalPriorityScore >= 75) {
      priority = 'HIGH';
    } else if (totalPriorityScore >= 50) {
      priority = 'MEDIUM';
    }

    const reason =
      input.requirementType === 'REQUIRED'
        ? `${input.skillName} is explicitly required by this job and missing from your profile.${
            input.isPrerequisiteToOtherMissing
              ? ' It also serves as a foundational prerequisite for other required skills.'
              : ''
          }`
        : `${input.skillName} is listed as a preferred skill that will strengthen your candidacy.`;

    return {
      id: '', // Will be assigned by database or UUID
      skillId: input.skillId || null,
      skillName: input.skillName,
      priority,
      priorityScore: Math.round(totalPriorityScore * 100) / 100,
      requirementType: input.requirementType,
      skillStatus: 'MISSING' as SkillGapStatus,
      jobRelevance,
      dependencyImportance,
      semanticRelevance,
      reason,
    };
  }

  /**
   * Deterministic Job Readiness Calculation:
   * If totalRequired > 0: requiredScore = (matchedRequired / totalRequired) * 80 else 80
   * If totalPreferred > 0: preferredScore = (matchedPreferred / totalPreferred) * 20 else 20
   * readinessScore = requiredScore + preferredScore
   */
  static calculateReadiness(input: ReadinessCalculationInput): {
    score: number;
    level: ReadinessLevel;
  } {
    const reqScore =
      input.totalRequired > 0
        ? (Math.min(input.totalRequired, input.matchedRequired) / input.totalRequired) * 80
        : 80;

    const prefScore =
      input.totalPreferred > 0
        ? (Math.min(input.totalPreferred, input.matchedPreferred) / input.totalPreferred) * 20
        : 20;

    const totalReadiness = Math.min(100, Math.max(0, Math.round((reqScore + prefScore) * 100) / 100));

    let level: ReadinessLevel = 'EARLY_STAGE';
    if (totalReadiness >= 90) {
      level = 'JOB_READY';
    } else if (totalReadiness >= 75) {
      level = 'NEARLY_READY';
    } else if (totalReadiness >= 60) {
      level = 'DEVELOPING';
    } else if (totalReadiness >= 40) {
      level = 'SIGNIFICANT_GAPS';
    }

    return {
      score: totalReadiness,
      level,
    };
  }
}
