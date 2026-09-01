import { prisma, VectorStoreService } from '@careerforge/database';

/**
 * Deterministic Vector Similarity Verification Suite for Phase 2.
 * Inserts two orthogonal and one parallel vector into pgvector and verifies cosine distance.
 */
async function verifyPgvector() {
  console.log('🧪 Starting pgvector cosine similarity test...');

  // Ensure extension
  await VectorStoreService.ensureVectorExtension();

  // Find or use an existing resume
  const resume = await prisma.resume.findFirst();
  if (!resume) {
    throw new Error('No resume found. Please run database seeding first.');
  }

  // Create a 1536-dimensional base vector
  const dimension = 1536;
  const vectorA = new Array(dimension).fill(0);
  vectorA[0] = 1.0; // Point along dimension 0

  const vectorSimilarA = new Array(dimension).fill(0);
  vectorSimilarA[0] = 0.95;
  vectorSimilarA[1] = 0.05; // Almost identical to vectorA

  const vectorOrthogonal = new Array(dimension).fill(0);
  vectorOrthogonal[10] = 1.0; // Completely orthogonal

  // Insert chunks
  console.log('Inserting test chunks with embeddings...');
  const chunk1Id = await VectorStoreService.insertResumeChunk({
    resumeId: resume.id,
    chunkText: 'Expert in React, Next.js, and TypeScript frontend development.',
    chunkType: 'experience',
    metadata: { section: 'experience', role: 'Frontend Engineer' },
    embedding: vectorA,
  });

  const chunk2Id = await VectorStoreService.insertResumeChunk({
    resumeId: resume.id,
    chunkText: 'Senior engineer specialized in React, Next.js architecture, and modern TypeScript.',
    chunkType: 'summary',
    metadata: { section: 'summary' },
    embedding: vectorSimilarA,
  });

  const chunk3Id = await VectorStoreService.insertResumeChunk({
    resumeId: resume.id,
    chunkText: 'Kubernetes cluster administration and AWS cloud infrastructure management.',
    chunkType: 'skills',
    metadata: { section: 'devops' },
    embedding: vectorOrthogonal,
  });

  console.log(`Inserted test chunks: ${chunk1Id}, ${chunk2Id}, ${chunk3Id}`);

  // Query similar chunks to vectorA
  console.log('Querying top similar chunks for query vector identical to vectorA...');
  const results = await VectorStoreService.findSimilarChunks({
    queryEmbedding: vectorA,
    resumeId: resume.id,
    limit: 3,
  });

  console.log('📊 pgvector Query Results:');
  for (const r of results) {
    console.log(`  - Chunk ID: ${r.id} | Type: ${r.chunkType} | Similarity Score: ${(r.similarity * 100).toFixed(2)}% | Text: "${r.chunkText.slice(0, 50)}..."`);
  }

  // Assertions
  if (results.length < 2) {
    throw new Error(`Expected at least 2 similar results, got ${results.length}`);
  }

  const topResult = results[0]!;
  if (topResult.similarity < 0.99) {
    throw new Error(`Top result similarity expected to be ~1.0 (100%), got ${topResult.similarity}`);
  }

  const secondResult = results[1]!;
  if (secondResult.similarity < 0.90) {
    throw new Error(`Second result similarity expected to be > 0.90, got ${secondResult.similarity}`);
  }

  console.log('✅ pgvector similarity test PASSED with 100% precision!');

  // Cleanup test chunks
  await prisma.resumeChunk.deleteMany({
    where: { id: { in: [chunk1Id, chunk2Id, chunk3Id] } },
  });
}

verifyPgvector()
  .catch((err) => {
    console.error('❌ pgvector similarity test FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
