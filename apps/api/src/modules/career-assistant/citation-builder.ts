import { RAGSource } from '@careerforge/types';

export class CitationBuilder {
  /**
   * Cleans, deduplicates, and ranks source citations for the client response.
   */
  static buildCitations(rawSources: RAGSource[]): RAGSource[] {
    const seen = new Set<string>();
    const deduplicated: RAGSource[] = [];

    for (const src of rawSources) {
      const key = `${src.sourceType}:${src.sourceId || src.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push({
          sourceType: src.sourceType,
          sourceId: src.sourceId,
          title: src.title,
          snippet: src.snippet ? src.snippet.slice(0, 250) : null,
          relevance: src.relevance ? Math.round(src.relevance * 100) / 100 : 1.0,
        });
      }
    }

    return deduplicated.slice(0, 5);
  }
}
