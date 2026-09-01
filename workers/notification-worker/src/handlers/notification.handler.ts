import { DomainEvent, NotificationRequestedPayload, NotificationType } from '@careerforge/types';
import { NotificationService } from '../../../../apps/api/src/modules/notifications/notification.service.js';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleNotificationRequested(event: DomainEvent<NotificationRequestedPayload>): Promise<void> {
  const { userId, candidateId, type, title, message } = event.payload as any;
  logger.info(`[NotificationWorker] Persisting notification for candidate=${candidateId || userId}: "${title}"`);

  await NotificationService.createNotification({
    candidateId: candidateId || null,
    userId: userId || null,
    type: (type as NotificationType) || 'SYSTEM_ALERT',
    title,
    message,
    metadata: {
      eventId: event.eventId,
      correlationId: event.correlationId,
    },
  });
}

export async function handleMatchCompleted(event: DomainEvent<any>): Promise<void> {
  const { candidateId, jobId, overallScore, matchLevel } = event.payload;
  logger.info(`[NotificationWorker] Handling match.completed for candidate=${candidateId}`);

  await NotificationService.createNotification({
    candidateId,
    type: 'MATCH_COMPLETED',
    title: 'Match Analysis Ready',
    message: `Your match score was calculated as ${overallScore}% (${matchLevel} match).`,
    metadata: {
      jobId,
      overallScore,
      matchLevel,
      eventId: event.eventId,
      correlationId: event.correlationId,
    },
  });
}

export async function handleSkillGapAnalyzed(event: DomainEvent<any>): Promise<void> {
  const { candidateId, jobId, overallReadiness, readinessLevel } = event.payload;
  logger.info(`[NotificationWorker] Handling skill-gap.analyzed for candidate=${candidateId}`);

  await NotificationService.createNotification({
    candidateId,
    type: 'SKILL_GAP_UPDATED',
    title: 'Personalized Learning Roadmap Ready',
    message: `Your skill gap analysis and learning path is available (${readinessLevel} - ${overallReadiness}% readiness).`,
    metadata: {
      jobId,
      overallReadiness,
      readinessLevel,
      eventId: event.eventId,
      correlationId: event.correlationId,
    },
  });
}

export async function handleRecommendationRefreshed(event: DomainEvent<any>): Promise<void> {
  const { candidateId, count } = event.payload;
  logger.info(`[NotificationWorker] Handling recommendation.refresh.completed for candidate=${candidateId}`);

  await NotificationService.createNotification({
    candidateId,
    type: 'JOB_RECOMMENDED',
    title: 'New Job Matches Available',
    message: `${count || 'Several'} new personalized job recommendations are now ready for you.`,
    metadata: {
      count,
      eventId: event.eventId,
      correlationId: event.correlationId,
    },
  });
}

export async function handleResumeProcessed(event: DomainEvent<any>): Promise<void> {
  const { candidateId, resumeId } = event.payload;
  logger.info(`[NotificationWorker] Handling resume.processed for candidate=${candidateId}`);

  await NotificationService.createNotification({
    candidateId,
    type: 'RESUME_PROCESSED',
    title: 'Resume Processed Successfully',
    message: 'Your resume has been parsed, verified, and indexed for semantic AI matching.',
    metadata: {
      resumeId,
      eventId: event.eventId,
      correlationId: event.correlationId,
    },
  });
}
