import { MatchLevel, MatchRecommendation, MatchBreakdown } from '@careerforge/types';

export class ScoreCalculator {
  /**
   * Weights defined by CareerForge AI Architecture:
   * Skill Match        = 40% (0.40)
   * Semantic Match     = 25% (0.25)
   * Experience Match   = 20% (0.20)
   * Education Match    = 10% (0.10)
   * Location Match     = 5%  (0.05)
   * Total              = 100%
   */
  static readonly WEIGHTS = {
    SKILLS: 0.4,
    SEMANTIC: 0.25,
    EXPERIENCE: 0.2,
    EDUCATION: 0.1,
    LOCATION: 0.05,
  } as const;

  /**
   * Calculates the overall deterministic match score rounded to two decimal places.
   */
  static calculateFinalScore(
    skillScore: number,
    semanticScore: number,
    experienceScore: number,
    educationScore: number,
    locationScore: number
  ): number {
    const s = Math.min(100, Math.max(0, skillScore));
    const sem = Math.min(100, Math.max(0, semanticScore));
    const exp = Math.min(100, Math.max(0, experienceScore));
    const edu = Math.min(100, Math.max(0, educationScore));
    const loc = Math.min(100, Math.max(0, locationScore));

    const weightedTotal =
      s * this.WEIGHTS.SKILLS +
      sem * this.WEIGHTS.SEMANTIC +
      exp * this.WEIGHTS.EXPERIENCE +
      edu * this.WEIGHTS.EDUCATION +
      loc * this.WEIGHTS.LOCATION;

    return Math.min(100, Math.max(0, Math.round(weightedTotal * 100) / 100));
  }

  /**
   * Determines deterministic match level based on the overall 100-point score.
   */
  static determineMatchLevel(finalScore: number): MatchLevel {
    if (finalScore >= 90) return 'EXCELLENT';
    if (finalScore >= 75) return 'STRONG';
    if (finalScore >= 60) return 'MODERATE';
    if (finalScore >= 40) return 'WEAK';
    return 'LOW';
  }

  /**
   * Determines recruitment recommendation category.
   */
  static determineRecommendation(finalScore: number, requiredSkillCoverage: number): MatchRecommendation {
    if (finalScore >= 85 && requiredSkillCoverage >= 80) return 'STRONGLY_APPLY';
    if (finalScore >= 70) return 'APPLY';
    if (finalScore >= 50) return 'CONSIDER';
    if (finalScore >= 35) return 'WEAK_MATCH';
    return 'NOT_RECOMMENDED';
  }

  /**
   * Builds normalized breakdown object.
   */
  static buildBreakdown(
    skillScore: number,
    semanticScore: number,
    experienceScore: number,
    educationScore: number,
    locationScore: number
  ): MatchBreakdown {
    return {
      skills: Math.round(skillScore * 100) / 100,
      semantic: Math.round(semanticScore * 100) / 100,
      experience: Math.round(experienceScore * 100) / 100,
      education: Math.round(educationScore * 100) / 100,
      location: Math.round(locationScore * 100) / 100,
    };
  }
}
