import { prisma } from '@careerforge/database';
import { DomainEvent, KafkaTopics, SkillGapAnalysisRequestedPayload, SkillGapAnalyzedPayload } from '@careerforge/types';
import { SkillGapService } from '../../../../apps/api/src/modules/skill-gap/skill-gap.service.js';
import { KafkaProducerService } from '../../../../apps/api/src/infrastructure/kafka/kafka.producer.js';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleSkillGapRequested(event: DomainEvent<SkillGapAnalysisRequestedPayload>): Promise<void> {
  const { candidateId, jobId } = event.payload;
  logger.info(`[AIWorker] Processing Skill Gap Analysis for candidate ${candidateId} vs job ${jobId}`);

  try {
    const candidate = await prisma.candidateProfile.findFirst({
      where: {
        OR: [{ id: candidateId }, { userId: candidateId }],
      },
    });

    if (!candidate) {
      throw new Error(`Candidate profile ${candidateId} not found`);
    }

    const analysis = await SkillGapService.analyzeSkillGaps(candidate.userId, jobId, true);

    const analyzedEvent: DomainEvent<SkillGapAnalyzedPayload> = {
      eventId: `gap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'skill-gap.analyzed',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-ai-worker',
      correlationId: event.correlationId,
      causationId: event.eventId,
      aggregateType: 'SkillGapAnalysis',
      aggregateId: analysis.id,
      payload: {
        analysisId: analysis.id,
        candidateId,
        jobId,
        overallReadiness: analysis.overallReadiness,
        readinessLevel: analysis.readinessLevel,
        highPriorityCount: analysis.highPriorityCount,
      },
    };

    await KafkaProducerService.publish(KafkaTopics.SKILL_GAP, analyzedEvent);
    logger.info(`[AIWorker] Skill gap analysis completed: Readiness=${analysis.overallReadiness}%`);
  } catch (err: any) {
    logger.error(`[AIWorker] Skill gap analysis failed: ${err.message}`);
    throw err;
  }
}
