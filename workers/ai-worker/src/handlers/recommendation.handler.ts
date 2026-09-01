import { prisma } from '@careerforge/database';
import { DomainEvent, KafkaTopics, RecommendationRefreshRequestedPayload, RecommendationGeneratedPayload } from '@careerforge/types';
import { RecommendationService } from '../../../../apps/api/src/modules/recommendation/recommendation.service.js';
import { KafkaProducerService } from '../../../../apps/api/src/infrastructure/kafka/kafka.producer.js';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleRecommendationRefreshRequested(
  event: DomainEvent<RecommendationRefreshRequestedPayload>
): Promise<void> {
  const { candidateId } = event.payload;
  logger.info(`[AIWorker] Refreshing job recommendations asynchronously for candidate ${candidateId}`);

  try {
    const candidate = await prisma.candidateProfile.findFirst({
      where: {
        OR: [{ id: candidateId }, { userId: candidateId }],
      },
    });

    if (!candidate) {
      throw new Error(`Candidate profile ${candidateId} not found`);
    }

    const recs = await RecommendationService.getRecommendedJobs(candidate.userId, {
      forceRefresh: true,
    });

    const generatedEvent: DomainEvent<RecommendationGeneratedPayload> = {
      eventId: `recgen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'recommendation.generated',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-ai-worker',
      correlationId: event.correlationId,
      causationId: event.eventId,
      aggregateType: 'CandidateProfile',
      aggregateId: candidateId,
      payload: {
        candidateId,
        jobCount: recs.total,
        topScore: recs.items[0]?.recommendationScore || 0,
        engineVersion: recs.engineVersion,
      },
    };

    await KafkaProducerService.publish(KafkaTopics.RECOMMENDATION, generatedEvent);
    logger.info(`[AIWorker] Generated ${recs.total} recommendations for candidate ${candidateId}`);
  } catch (err: any) {
    logger.error(`[AIWorker] Recommendation refresh failed: ${err.message}`);
    throw err;
  }
}
