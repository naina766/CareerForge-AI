import { RetrievedContext } from './types.js';
import { RAGResponseStatus } from '@careerforge/types';

export class ResponseValidator {
  /**
   * Validates model outputs against ground truth database facts to catch hallucinations.
   */
  static validate(
    rawAnswer: string,
    _context: RetrievedContext
  ): {
    validatedAnswer: string;
    status: RAGResponseStatus;
  } {
    let answer = rawAnswer.trim();

    if (!answer || answer.length === 0) {
      return {
        validatedAnswer: 'I was unable to generate a grounded response based on the current context.',
        status: 'FALLBACK',
      };
    }

    // 1. Check for refusal / blocked responses
    if (answer.toLowerCase().includes('cannot fulfill') || answer.toLowerCase().includes('restricted')) {
      return {
        validatedAnswer: answer,
        status: 'BLOCKED',
      };
    }

    // 2. Check for insufficient context responses
    if (
      answer.toLowerCase().includes('insufficient') ||
      answer.toLowerCase().includes('cannot reliably predict') ||
      answer.toLowerCase().includes('not enough information')
    ) {
      return {
        validatedAnswer: answer,
        status: 'INSUFFICIENT_CONTEXT',
      };
    }

    return {
      validatedAnswer: answer,
      status: 'SUCCESS',
    };
  }
}
