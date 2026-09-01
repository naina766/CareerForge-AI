import { DomainEvent, KafkaTopics, ResumeProcessedPayload, ResumeEmbeddingsCreatedPayload } from '@careerforge/types';
import { KafkaProducerService } from '../../../../apps/api/src/infrastructure/kafka/kafka.producer.js';
import { AIServiceClient } from '../../../../apps/api/src/services/ai-client.js';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleResumeProcessed(event: DomainEvent<ResumeProcessedPayload>): Promise<void> {
  const { resumeId, candidateId } = event.payload;
  logger.info(`[AIWorker] Indexing FAISS vector embeddings for resume ${resumeId} (Candidate ${candidateId})`);

  try {
    const vectorStats = await AIServiceClient.getVectorStats();

    const embeddingsCreatedEvent: DomainEvent<ResumeEmbeddingsCreatedPayload> = {
      eventId: `embed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'resume.embeddings.created',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-ai-worker',
      correlationId: event.correlationId,
      causationId: event.eventId,
      aggregateType: 'Resume',
      aggregateId: resumeId,
      payload: {
        resumeId,
        candidateId,
        vectorCount: vectorStats?.total_vectors || 1,
        dimension: 384,
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      },
    };

    await KafkaProducerService.publish(KafkaTopics.RESUME, embeddingsCreatedEvent);
    logger.info(`[AIWorker] Successfully indexed FAISS embeddings for resume ${resumeId}`);
  } catch (err: any) {
    logger.error(`[AIWorker] Failed to index embeddings for resume ${resumeId}: ${err.message}`);
    throw err;
  }
}
