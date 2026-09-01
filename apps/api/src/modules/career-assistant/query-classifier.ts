import { QueryIntent } from './types.js';

export class QueryClassifier {
  /**
   * Deterministically classifies candidate natural-language questions into functional domains.
   */
  static classify(query: string): QueryIntent {
    const q = query.toLowerCase().trim();

    // 1. Skill Gap Intent
    if (
      q.includes('skill gap') ||
      q.includes('missing skill') ||
      q.includes('what skills do i need') ||
      q.includes('skills am i missing') ||
      q.includes('biggest gaps')
    ) {
      return 'SKILL_GAP';
    }

    // 2. Learning & Roadmap Intent
    if (
      q.includes('learn') ||
      q.includes('roadmap') ||
      q.includes('prerequisite') ||
      q.includes('course') ||
      q.includes('tutorial') ||
      q.includes('study') ||
      q.includes('what should i study')
    ) {
      return 'LEARNING';
    }

    // 3. Match & Readiness Intent
    if (
      q.includes('match') ||
      q.includes('ready for this job') ||
      q.includes('am i qualified') ||
      q.includes('score') ||
      q.includes('fit for') ||
      q.includes('how well do i match')
    ) {
      return 'MATCH';
    }

    // 4. Resume Intent
    if (
      q.includes('resume') ||
      q.includes('cv') ||
      q.includes('rewrite') ||
      q.includes('tailor') ||
      q.includes('ats score')
    ) {
      return 'RESUME';
    }

    // 5. Application Intent
    if (
      q.includes('application') ||
      q.includes('status of my') ||
      q.includes('applied') ||
      q.includes('interview stage') ||
      q.includes('job offer')
    ) {
      return 'APPLICATION';
    }

    // 6. Job Discovery & Recommendation Intent
    if (
      q.includes('job') ||
      q.includes('recommend') ||
      q.includes('vacancy') ||
      q.includes('position') ||
      q.includes('salary') ||
      q.includes('work mode')
    ) {
      return 'JOB';
    }

    // 7. Profile Intent
    if (
      q.includes('profile') ||
      q.includes('my skills') ||
      q.includes('experience') ||
      q.includes('preferences')
    ) {
      return 'PROFILE';
    }

    return 'GENERAL_CAREER';
  }
}
