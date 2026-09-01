import { RecommendationLevel, RecommendationBreakdown } from '@careerforge/types';

export interface RecommendationScoreInput {
  skillScore: number;
  semanticScore: number;
  experienceScore: number;
  preferenceScore: number;
  freshnessScore: number;
  matchedSkills: string[];
  missingRequiredSkills: string[];
  workMode: string;
  location: string;
}

export class RecommendationScorer {
  /**
   * Deterministic 100-Point Recommendation Formula:
   * recommendationScore = skillScore * 0.40 + semanticScore * 0.25 + experienceScore * 0.15 + preferenceScore * 0.15 + freshnessScore * 0.05
   */
  static calculateScore(breakdown: RecommendationBreakdown): {
    score: number;
    level: RecommendationLevel;
  } {
    const raw =
      breakdown.skillScore * 0.4 +
      breakdown.semanticScore * 0.25 +
      breakdown.experienceScore * 0.15 +
      breakdown.preferenceScore * 0.15 +
      breakdown.freshnessScore * 0.05;

    const score = Math.min(100, Math.max(0, Math.round(raw * 100) / 100));

    let level: RecommendationLevel = 'LOW_MATCH';
    if (score >= 90) {
      level = 'TOP_MATCH';
    } else if (score >= 80) {
      level = 'EXCELLENT_MATCH';
    } else if (score >= 70) {
      level = 'STRONG_MATCH';
    } else if (score >= 60) {
      level = 'GOOD_MATCH';
    } else if (score >= 50) {
      level = 'POSSIBLE_MATCH';
    }

    return { score, level };
  }

  /**
   * Generates grounded, explainable "Why this job?" synthesis without LLM hallucinations.
   */
  static generateReason(input: RecommendationScoreInput): string {
    const parts: string[] = [];

    // 1. Skill Alignment
    if (input.matchedSkills.length > 0) {
      const topSkills = input.matchedSkills.slice(0, 4).join(', ');
      if (input.skillScore >= 80) {
        parts.push(`Strong technical match with your profile possessing key required skills (${topSkills}).`);
      } else if (input.skillScore >= 50) {
        parts.push(`Solid technical overlap with your verified skills (${topSkills}).`);
      }
    }

    // 2. Experience Compatibility
    if (input.experienceScore >= 90) {
      parts.push(`Your years of professional experience directly meet or exceed the role's criteria.`);
    } else if (input.experienceScore >= 70) {
      parts.push(`Your experience profile aligns well with the stated level of seniority.`);
    }

    // 3. Preference Alignment
    if (input.preferenceScore >= 85) {
      parts.push(`The ${input.workMode.toLowerCase()} work mode and ${input.location} location align with your career preferences.`);
    }

    // 4. Missing Skills Note
    if (input.missingRequiredSkills.length > 0) {
      const missingList = input.missingRequiredSkills.slice(0, 2).join(', ');
      parts.push(`Prioritizing learning ${missingList} will further boost your candidacy.`);
    }

    if (parts.length === 0) {
      return `Position matches your career profile based on overall technical requirements and role parameters.`;
    }

    return parts.join(' ');
  }
}
