import { EducationMatchDetails } from '@careerforge/types';

export interface RawCandidateEducation {
  degree: string;
  fieldOfStudy?: string | null;
}

const STEM_FIELDS = [
  'computer science',
  'computer engineering',
  'software engineering',
  'information technology',
  'data science',
  'artificial intelligence',
  'electrical engineering',
  'information systems',
  'mathematics',
  'physics',
  'statistics',
  'engineering',
];

export class EducationMatcher {
  /**
   * Evaluates candidate educational qualifications against job requirements.
   * Weight contribution: 10% of overall match score.
   */
  static evaluate(
    candidateEducations: RawCandidateEducation[] = [],
    jobText: string = ''
  ): EducationMatchDetails {
    const textLower = (jobText || '').toLowerCase();

    // 1. Detect Job Required Degree Level
    let requiredLevel = 0; // 0 = None specified, 1 = Associate, 2 = Bachelor, 3 = Master, 4 = PhD
    let requiredDegreeLabel = 'Not specified';

    if (textLower.includes('ph.d') || textLower.includes('phd') || textLower.includes('doctorate')) {
      requiredLevel = 4;
      requiredDegreeLabel = "Ph.D. / Doctorate";
    } else if (textLower.includes("master's") || textLower.includes('master') || textLower.includes('m.s.') || textLower.includes('m.tech') || textLower.includes('mba')) {
      requiredLevel = 3;
      requiredDegreeLabel = "Master's Degree";
    } else if (
      textLower.includes("bachelor's") ||
      textLower.includes('bachelor') ||
      textLower.includes('b.s.') ||
      textLower.includes('b.tech') ||
      textLower.includes('b.e.') ||
      textLower.includes('undergraduate degree')
    ) {
      requiredLevel = 2;
      requiredDegreeLabel = "Bachelor's Degree";
    } else if (textLower.includes('associate') || textLower.includes('diploma')) {
      requiredLevel = 1;
      requiredDegreeLabel = "Associate Degree";
    }

    // If job does not specify formal education requirements
    if (requiredLevel === 0) {
      return {
        score: 100,
        candidateDegrees: candidateEducations.map((e) => `${e.degree}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ''}`),
        requiredDegree: 'None Specified (Experience-led)',
        status: 'NOT_SPECIFIED',
      };
    }

    // If candidate has no educational records on file
    if (!candidateEducations || candidateEducations.length === 0) {
      return {
        score: 0,
        candidateDegrees: [],
        requiredDegree: requiredDegreeLabel,
        status: 'BELOW',
      };
    }

    // 2. Evaluate Candidate Degrees
    let maxCandidateLevel = 0;
    let hasStemField = false;
    const degreeLabels: string[] = [];

    for (const edu of candidateEducations) {
      const dLower = (edu.degree || '').toLowerCase();
      const fLower = (edu.fieldOfStudy || '').toLowerCase();
      degreeLabels.push(`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`);

      let level = 0;
      if (dLower.includes('phd') || dLower.includes('doctor')) level = 4;
      else if (dLower.includes('master') || dLower.includes('m.s') || dLower.includes('m.tech') || dLower.includes('mba')) level = 3;
      else if (dLower.includes('bachelor') || dLower.includes('b.s') || dLower.includes('b.tech') || dLower.includes('b.e') || dLower.includes('bs')) level = 2;
      else if (dLower.includes('associate') || dLower.includes('diploma')) level = 1;

      if (level > maxCandidateLevel) {
        maxCandidateLevel = level;
      }

      if (STEM_FIELDS.some((stem) => fLower.includes(stem) || dLower.includes(stem))) {
        hasStemField = true;
      }
    }

    // 3. Scoring Matrix
    if (maxCandidateLevel >= requiredLevel) {
      // Met or exceeded level
      if (hasStemField || requiredLevel <= 1) {
        return {
          score: 100,
          candidateDegrees: degreeLabels,
          requiredDegree: requiredDegreeLabel,
          status: 'COMPATIBLE',
        };
      }
      // Met degree level but in non-STEM / different discipline
      return {
        score: 75,
        candidateDegrees: degreeLabels,
        requiredDegree: requiredDegreeLabel,
        status: 'PARTIAL',
      };
    }

    if (maxCandidateLevel === requiredLevel - 1) {
      // 1 step below required
      return {
        score: hasStemField ? 50 : 35,
        candidateDegrees: degreeLabels,
        requiredDegree: requiredDegreeLabel,
        status: 'PARTIAL',
      };
    }

    return {
      score: 20,
      candidateDegrees: degreeLabels,
      requiredDegree: requiredDegreeLabel,
      status: 'BELOW',
    };
  }
}
