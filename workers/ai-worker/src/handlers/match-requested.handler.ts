import { prisma } from '@careerforge/database';
import { DomainEvent, KafkaTopics, MatchRequestedPayload, MatchCompletedPayload } from '@careerforge/types';
import { MatchingService } from '../../../../apps/api/src/modules/matching/matching.service.js';
import { KafkaProducerService } from '../../../../apps/api/src/infrastructure/kafka/kafka.producer.js';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleMatchRequested(event: DomainEvent<MatchRequestedPayload>): Promise<void> {
  const { candidateId, jobId } = event.payload;
  logger.info(`[AIWorker] Processing asynchronous match evaluation for candidate ${candidateId} vs job ${jobId}`);

  try {
    const candidate = await prisma.candidateProfile.findFirst({
      where: {
        OR: [{ id: candidateId }, { userId: candidateId }],
      },
    });

    if (!candidate) {
      throw new Error(`Candidate profile ${candidateId} not found`);
    }

    const report = await MatchingService.getCandidateJobMatch(
      candidate.userId,
      jobId,
      event.payload.forceRecompute ?? true
    );

    const matchCompletedEvent: DomainEvent<MatchCompletedPayload> = {
      eventId: `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'match.completed',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-ai-worker',
      correlationId: event.correlationId,
      causationId: event.eventId,
      aggregateType: 'MatchReport',
      aggregateId: report.id,
      payload: {
        matchReportId: report.id,
        candidateId,
        jobId,
        overallScore: report.overallScore,
        matchLevel: report.matchLevel,
        recommendation: report.recommendation,
      },
    };

    await KafkaProducerService.publish(KafkaTopics.MATCHING, matchCompletedEvent);
    logger.info(`[AIWorker] Match completed: Score=${report.overallScore}%, emitted match.completed`);
  } catch (err: any) {
    logger.error(`[AIWorker] Match calculation failed for candidate ${candidateId}: ${err.message}`);
    throw err;
  }
}
