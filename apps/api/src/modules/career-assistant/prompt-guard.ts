import { PromptGuardResult } from './types.js';

export class PromptGuard {
  private static readonly ADVERSARIAL_PATTERNS = [
    /ignore (?:all )?(?:previous|existing|prior) instructions/i,
    /ignore (?:all )?(?:rules|guardrails|safety)/i,
    /reveal (?:your )?(?:system prompt|internal instructions)/i,
    /system prompt/i,
    /show (?:me )?(?:another|all|other) (?:candidate|user|resume)/i,
    /tell (?:me )?(?:another|other) candidate/i,
    /database (?:credentials|password|connection|string)/i,
    /api keys?/i,
    /forget (?:your )?(?:grounding|all) rules/i,
    /pretend (?:you are|to be) (?:an )?unrestricted (?:ai|model)/i,
    /administrator(?:'s)? (?:information|access|credentials)/i,
    /hidden instructions/i,
    /dan mode/i,
    /jailbreak/i,
    /bypass (?:security|guardrails|filters)/i,
  ];

  /**
   * Evaluates incoming user prompt for injection and exfiltration attacks before retrieval.
   */
  static evaluate(query: string): PromptGuardResult {
    if (!query || query.trim().length === 0) {
      return { isSafe: true };
    }

    const trimmed = query.trim();

    for (const pattern of this.ADVERSARIAL_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isSafe: false,
          blockedReason:
            'I can help with your career data, job matches, skill gaps, and learning roadmaps, but I cannot fulfill requests that attempt to override security instructions or access restricted administrative information.',
        };
      }
    }

    return { isSafe: true };
  }
}
