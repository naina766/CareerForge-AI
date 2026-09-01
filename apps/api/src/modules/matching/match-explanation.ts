import {
  SkillMatchDetails,
  ExperienceMatchDetails,
  EducationMatchDetails,
  LocationMatchDetails,
  MatchLevel,
} from '@careerforge/types';

export interface ExplanationInput {
  finalScore: number;
  matchLevel: MatchLevel;
  skills: SkillMatchDetails;
  experience: ExperienceMatchDetails;
  education: EducationMatchDetails;
  location: LocationMatchDetails;
  jobTitle: string;
  companyName: string;
}

export class MatchExplanationService {
  /**
   * Generates a deterministic, factual, and grounded match explanation.
   * Guaranteed to never invent skills, alter numeric scores, or hallucinate requirements.
   */
  static generateDeterministicExplanation(input: ExplanationInput): string {
    const sentences: string[] = [];

    // 1. Skill Match summary
    if (input.skills.matchedSkills.length > 0) {
      const topMatched = input.skills.matchedSkills.slice(0, 4).join(', ');
      sentences.push(`Your strongest technical matches are ${topMatched}.`);
    } else {
      sentences.push(`No direct required technical skills matched your current profile.`);
    }

    // 2. Missing Skills
    if (input.skills.missingRequiredSkills.length > 0) {
      const missingList = input.skills.missingRequiredSkills.slice(0, 3).join(', ');
      sentences.push(
        `The position mandates ${missingList}, which ${input.skills.missingRequiredSkills.length === 1 ? 'is' : 'are'} currently missing from your verified profile.`
      );
    } else if (input.skills.missingPreferredSkills.length > 0) {
      const prefList = input.skills.missingPreferredSkills.slice(0, 2).join(', ');
      sentences.push(`Preferred nice-to-have skills such as ${prefList} could further strengthen your candidacy.`);
    }

    // 3. Experience comparison
    if (input.experience.requiredYears > 0) {
      if (input.experience.status === 'MEETS' || input.experience.status === 'EXCEEDS') {
        sentences.push(
          `Your ${input.experience.candidateYears} years of experience meet the requested ${input.experience.requiredYears} years.`
        );
      } else {
        sentences.push(
          `Your ${input.experience.candidateYears} years of experience are ${input.experience.gap} year(s) below the requested ${input.experience.requiredYears} years.`
        );
      }
    }

    // 4. Education & Location compatibility
    const eduPhrase =
      input.education.status === 'COMPATIBLE'
        ? `Your education matches the required qualifications`
        : `Your educational background was evaluated`;

    const locPhrase =
      input.location.status === 'COMPATIBLE'
        ? `the job's ${input.location.jobWorkMode.toLowerCase()} work mode is compatible with your location preferences.`
        : `work mode alignment was noted as ${input.location.status.toLowerCase()}.`;

    sentences.push(`${eduPhrase} and ${locPhrase}`);

    return sentences.join(' ');
  }
}
