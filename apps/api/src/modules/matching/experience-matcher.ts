import { ExperienceMatchDetails } from '@careerforge/types';

export class ExperienceMatcher {
  /**
   * Evaluates candidate years of experience against job requirements.
   * Weight contribution: 20% of overall match score.
   */
  static evaluate(
    candidateYears: number | null | undefined,
    experienceMin: number = 0,
    experienceMax?: number | null
  ): ExperienceMatchDetails {
    const years = Math.max(0, Number(candidateYears) || 0);
    const minReq = Math.max(0, Number(experienceMin) || 0);
    const maxPref = experienceMax !== null && experienceMax !== undefined ? Number(experienceMax) : null;

    // Case 1: Job has no experience requirement (entry level)
    if (minReq === 0) {
      return {
        score: 100,
        candidateYears: years,
        requiredYears: 0,
        preferredYears: maxPref,
        gap: 0,
        status: 'MEETS',
      };
    }

    // Case 2: Candidate meets or exceeds minimum requirement
    if (years >= minReq) {
      if (maxPref && years >= maxPref) {
        return {
          score: 100,
          candidateYears: years,
          requiredYears: minReq,
          preferredYears: maxPref,
          gap: 0,
          status: 'EXCEEDS',
        };
      }

      // If between min and max (or min defined with no max)
      const buffer = maxPref ? Math.max(1, maxPref - minReq) : 2;
      const progress = Math.min(1.0, (years - minReq) / buffer);
      const score = 80 + progress * 20;

      return {
        score: Math.min(100, Math.max(0, Math.round(score * 100) / 100)),
        candidateYears: years,
        requiredYears: minReq,
        preferredYears: maxPref,
        gap: 0,
        status: 'MEETS',
      };
    }

    // Case 3: Candidate experience is below minimum requirement
    const gap = Math.round((minReq - years) * 10) / 10;
    const ratio = years / minReq;
    // Score scaled proportionally up to 70
    const score = Math.max(0, Math.round(ratio * 70 * 100) / 100);

    return {
      score: Math.min(70, score),
      candidateYears: years,
      requiredYears: minReq,
      preferredYears: maxPref,
      gap,
      status: 'BELOW',
    };
  }
}
