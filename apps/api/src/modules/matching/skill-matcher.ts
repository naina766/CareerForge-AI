import { SkillMatchDetails } from '@careerforge/types';
import { SkillService } from '../skill/skill.service.js';

export interface RawCandidateSkill {
  name: string;
  proficiency?: string | null;
  yearsOfExperience?: number | null;
}

export interface RawJobSkill {
  name: string;
  required: boolean;
  importance?: 'REQUIRED' | 'PREFERRED';
  minimumYears?: number | null;
}

export class SkillMatcher {
  /**
   * Evaluates candidate skills against required and preferred job skills with canonical taxonomy normalization.
   * Weight contribution: 40% of overall match score.
   */
  static async evaluate(
    candidateSkills: RawCandidateSkill[],
    jobSkills: RawJobSkill[]
  ): Promise<SkillMatchDetails> {
    if (!jobSkills || jobSkills.length === 0) {
      return {
        score: 100,
        required: { matched: 0, total: 0, percentage: 100 },
        preferred: { matched: 0, total: 0, percentage: 100 },
        matchedSkills: candidateSkills.map((s) => s.name),
        missingRequiredSkills: [],
        missingPreferredSkills: [],
        candidateExtraSkills: candidateSkills.map((s) => s.name),
      };
    }

    // 1. Normalize candidate skills using Phase 7 Taxonomy
    const candidateSkillNames = candidateSkills.map((s) => s.name.trim()).filter(Boolean);
    const candidateResolved = await SkillService.resolveSkills(candidateSkillNames);
    
    // Map canonical slug / canonicalName / rawInput -> canonical display name
    const candidateCanonicalMap = new Map<string, string>();
    for (const item of candidateResolved) {
      if (item.canonicalName && item.slug) {
        candidateCanonicalMap.set(item.slug.toLowerCase(), item.canonicalName);
        candidateCanonicalMap.set(item.canonicalName.toLowerCase(), item.canonicalName);
      }
      candidateCanonicalMap.set(item.input.toLowerCase(), item.canonicalName || item.input);
    }

    // 2. Separate and normalize Job Skills (Required vs Preferred)
    const requiredJobSkills = jobSkills.filter((s) => s.required || s.importance === 'REQUIRED');
    const preferredJobSkills = jobSkills.filter((s) => !s.required && s.importance === 'PREFERRED');

    const requiredResolved = await SkillService.resolveSkills(requiredJobSkills.map((s) => s.name));
    const preferredResolved = await SkillService.resolveSkills(preferredJobSkills.map((s) => s.name));

    // 3. Match Required Skills
    const matchedRequired: string[] = [];
    const missingRequired: string[] = [];

    for (const req of requiredResolved) {
      const canonicalName = req.canonicalName || req.input;
      const canonicalSlug = req.slug?.toLowerCase() || req.input.toLowerCase();
      const rawLower = req.input.toLowerCase();

      if (
        candidateCanonicalMap.has(canonicalSlug) ||
        candidateCanonicalMap.has(rawLower) ||
        candidateCanonicalMap.has(canonicalName.toLowerCase())
      ) {
        matchedRequired.push(canonicalName);
      } else {
        missingRequired.push(canonicalName);
      }
    }

    // 4. Match Preferred Skills
    const matchedPreferred: string[] = [];
    const missingPreferred: string[] = [];

    for (const pref of preferredResolved) {
      const canonicalName = pref.canonicalName || pref.input;
      const canonicalSlug = pref.slug?.toLowerCase() || pref.input.toLowerCase();
      const rawLower = pref.input.toLowerCase();

      if (
        candidateCanonicalMap.has(canonicalSlug) ||
        candidateCanonicalMap.has(rawLower) ||
        candidateCanonicalMap.has(canonicalName.toLowerCase())
      ) {
        matchedPreferred.push(canonicalName);
      } else {
        missingPreferred.push(canonicalName);
      }
    }

    // Deduplicate lists
    const uniqueMatchedRequired = Array.from(new Set(matchedRequired));
    const uniqueMissingRequired = Array.from(new Set(missingRequired));
    const uniqueMatchedPreferred = Array.from(new Set(matchedPreferred));
    const uniqueMissingPreferred = Array.from(new Set(missingPreferred));

    const allMatched = Array.from(new Set([...uniqueMatchedRequired, ...uniqueMatchedPreferred]));

    // Find extra candidate skills
    const allJobSkillKeys = new Set([
      ...requiredResolved.map((r) => r.canonicalName?.toLowerCase() || r.input.toLowerCase()),
      ...preferredResolved.map((p) => p.canonicalName?.toLowerCase() || p.input.toLowerCase()),
    ]);

    const extraSkills: string[] = [];
    for (const [, name] of candidateCanonicalMap.entries()) {
      if (!allJobSkillKeys.has(name.toLowerCase()) && !extraSkills.includes(name)) {
        extraSkills.push(name);
      }
    }

    // 5. Calculate Required & Preferred Coverages
    const totalRequired = uniqueMatchedRequired.length + uniqueMissingRequired.length;
    const totalPreferred = uniqueMatchedPreferred.length + uniqueMissingPreferred.length;

    const requiredCoverage = totalRequired > 0 ? (uniqueMatchedRequired.length / totalRequired) : 1.0;
    const preferredCoverage = totalPreferred > 0 ? (uniqueMatchedPreferred.length / totalPreferred) : 1.0;

    // 6. Weighted Deterministic Skill Score Formula
    let skillScore = 0;
    if (totalRequired > 0 && totalPreferred > 0) {
      // 80% weight to required skills, 20% to preferred
      skillScore = (requiredCoverage * 80) + (preferredCoverage * 20);
    } else if (totalRequired > 0 && totalPreferred === 0) {
      skillScore = requiredCoverage * 100;
    } else if (totalRequired === 0 && totalPreferred > 0) {
      skillScore = preferredCoverage * 100;
    } else {
      skillScore = 100;
    }

    const clampedScore = Math.min(100, Math.max(0, Math.round(skillScore * 100) / 100));

    return {
      score: clampedScore,
      required: {
        matched: uniqueMatchedRequired.length,
        total: totalRequired,
        percentage: Math.round(requiredCoverage * 10000) / 100,
      },
      preferred: {
        matched: uniqueMatchedPreferred.length,
        total: totalPreferred,
        percentage: Math.round(preferredCoverage * 10000) / 100,
      },
      matchedSkills: allMatched,
      missingRequiredSkills: uniqueMissingRequired,
      missingPreferredSkills: uniqueMissingPreferred,
      candidateExtraSkills: extraSkills,
    };
  }
}
