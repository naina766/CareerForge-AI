import { prisma } from './client.js';

export interface SimilarChunkResult {
  id: string;
  resumeId: string;
  chunkText: string;
  chunkType: string;
  metadata: unknown;
  similarity: number;
}

export class VectorStoreService {
  /**
   * Ensures the pgvector extension is enabled in PostgreSQL.
   */
  static async ensureVectorExtension(): Promise<void> {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
  }

  /**
   * Inserts a ResumeChunk with a high-dimensional embedding vector.
   */
  static async insertResumeChunk(params: {
    resumeId: string;
    chunkText: string;
    chunkType?: string;
    metadata?: Record<string, unknown>;
    embedding: number[];
  }): Promise<string> {
    const vectorStr = `[${params.embedding.join(',')}]`;
    const metadataStr = JSON.stringify(params.metadata ?? {});
    const chunkType = params.chunkType ?? 'section';

    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      INSERT INTO "ResumeChunk" ("id", "resumeId", "chunkText", "chunkType", "metadata", "embedding", "createdAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5::vector, NOW())
      RETURNING "id";
    `, params.resumeId, params.chunkText, chunkType, metadataStr, vectorStr);

    return result[0]?.id || '';
  }

  /**
   * Performs cosine similarity search against ResumeChunks.
   * Cosine distance = 1 - cosine_similarity. Similarity = 1 - (<=>).
   */
  static async findSimilarChunks(params: {
    queryEmbedding: number[];
    limit?: number;
    resumeId?: string;
    minSimilarity?: number;
  }): Promise<SimilarChunkResult[]> {
    const vectorStr = `[${params.queryEmbedding.join(',')}]`;
    const limit = params.limit ?? 5;
    const minSim = params.minSimilarity ?? 0.0;

    let query = `
      SELECT 
        "id",
        "resumeId",
        "chunkText",
        "chunkType",
        "metadata",
        (1 - ("embedding" <=> $1::vector)) AS similarity
      FROM "ResumeChunk"
      WHERE "embedding" IS NOT NULL
    `;

    const queryParams: unknown[] = [vectorStr];

    if (params.resumeId) {
      queryParams.push(params.resumeId);
      query += ` AND "resumeId" = $${queryParams.length}`;
    }

    if (minSim > 0) {
      queryParams.push(minSim);
      query += ` AND (1 - ("embedding" <=> $1::vector)) >= $${queryParams.length}`;
    }

    queryParams.push(limit);
    query += ` ORDER BY "embedding" <=> $1::vector ASC LIMIT $${queryParams.length};`;

    return await prisma.$queryRawUnsafe<SimilarChunkResult[]>(query, ...queryParams);
  }
}
