import { SemanticMatchDetails } from '@careerforge/types';
import { AIServiceClient } from '../../services/ai-client.js';

export interface SemanticMatchJobInput {
  title: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
}

export class SemanticMatcher {
  /**
   * Evaluates semantic vector similarity between job description and candidate resume chunks using FAISS.
   * Weight contribution: 25% of overall match score.
   */
  static async evaluate(
    resumeId: string | null | undefined,
    job: SemanticMatchJobInput
  ): Promise<SemanticMatchDetails> {
    if (!resumeId) {
      return {
        score: 0,
        matchedChunksCount: 0,
        status: 'NO_EMBEDDING',
        note: 'Semantic similarity unavailable because candidate has not uploaded or indexed a resume.',
      };
    }

    try {
      // Construct targeted semantic query from job context
      const queryParts = [job.title, job.description];
      if (job.requirements) queryParts.push(job.requirements);
      if (job.responsibilities) queryParts.push(job.responsibilities);
      const queryText = queryParts.join('\n\n').slice(0, 4000);

      // Perform FAISS vector search filtered to candidate's resumeId
      const searchRes = await AIServiceClient.searchVectors(queryText, 5, resumeId);

      if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
        return {
          score: 0,
          matchedChunksCount: 0,
          status: 'UNAVAILABLE',
          note: 'Semantic vectors not found in FAISS index for this resume.',
        };
      }

      // In IndexFlatIP with L2-normalized vectors, similarity is cosine similarity in [-1.0, 1.0]
      const topSimilarity = searchRes.results[0]?.similarity_score ?? 0;
      const normalizedScore = this.normalizeSemanticScore(topSimilarity);

      return {
        score: normalizedScore,
        topSimilarity: Math.round(topSimilarity * 10000) / 10000,
        matchedChunksCount: searchRes.results.length,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        status: 'AVAILABLE',
        note: `FAISS semantic similarity score: ${topSimilarity} across ${searchRes.results.length} resume sections.`,
      };
    } catch (err: unknown) {
      const e = err as Error;
      return {
        score: 0,
        matchedChunksCount: 0,
        status: 'UNAVAILABLE',
        note: `Semantic vector search could not be completed: ${e.message || 'AI service unavailable'}.`,
      };
    }
  }

  /**
   * Dedicated normalization converting FAISS cosine similarity into a calibrated 0-100 score.
   * Cosine values:
   *   <= 0.00  -> 0
   *   >= 0.85  -> 100
   *   (0, 0.85) -> Linear interpolation (cosine / 0.85) * 100
   */
  static normalizeSemanticScore(cosineSim: number): number {
    if (cosineSim <= 0) return 0;
    if (cosineSim >= 0.85) return 100;
    const score = (cosineSim / 0.85) * 100;
    return Math.min(100, Math.max(0, Math.round(score * 100) / 100));
  }
}
