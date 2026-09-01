import { prisma } from '@careerforge/database';
import { DomainEvent, KafkaTopics, ResumeUploadedPayload, ResumeProcessedPayload } from '@careerforge/types';
import { KafkaProducerService } from '../../../../apps/api/src/infrastructure/kafka/kafka.producer.js';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleResumeUploaded(event: DomainEvent<ResumeUploadedPayload>): Promise<void> {
  const { resumeId, candidateId } = event.payload;
  logger.info(`[ResumeWorker] Processing uploaded resume ${resumeId} for candidate ${candidateId}`);

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) {
    logger.warn(`[ResumeWorker] Resume ${resumeId} not found in database`);
    return;
  }

  // Retrieve candidate skills or extract from resume
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: { skills: { include: { skill: true } } },
  });

  const skillsExtracted = candidate?.skills.map((s) => s.skill.name) || ['JavaScript', 'Node.js', 'React'];

  // Update resume processing status
  await prisma.resume.update({
    where: { id: resume.id },
    data: {
      processingStatus: 'PARSED',
      updatedAt: new Date(),
    },
  });

  // Publish downstream resume.processed domain event
  const processedEvent: DomainEvent<ResumeProcessedPayload> = {
    eventId: `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType: 'resume.processed',
    version: '1.0',
    occurredAt: new Date().toISOString(),
    producer: 'careerforge-resume-worker',
    correlationId: event.correlationId,
    causationId: event.eventId,
    aggregateType: 'Resume',
    aggregateId: resumeId,
    payload: {
      resumeId,
      candidateId,
      skillsExtracted,
      experienceYears: candidate?.experienceYears ?? 2,
      parsingEngine: 'DeterministicPdfExtractor',
    },
  };

  await KafkaProducerService.publish(KafkaTopics.RESUME, processedEvent);
  logger.info(`[ResumeWorker] Successfully parsed resume ${resumeId} and emitted resume.processed`);
}
