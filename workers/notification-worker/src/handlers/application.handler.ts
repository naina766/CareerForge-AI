import { prisma } from '@careerforge/database';
import { DomainEvent, ApplicationCreatedPayload, ApplicationStatusChangedPayload } from '@careerforge/types';
import { NotificationService } from '../../../../apps/api/src/modules/notifications/notification.service.js';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleApplicationCreated(event: DomainEvent<ApplicationCreatedPayload>): Promise<void> {
  const { candidateId, jobId, applicationId } = event.payload;
  logger.info(`[NotificationWorker] Handling application.created (Application=${applicationId})`);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { recruiter: true },
  });

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
  });

  // Notify Candidate
  if (candidate) {
    await NotificationService.createNotification({
      candidateId,
      userId: candidate.userId,
      type: 'APPLICATION_STATUS_CHANGED',
      title: 'Application Submitted Successfully',
      message: `Your application for "${job?.title || 'Job'}" has been submitted to the recruiting team.`,
      metadata: {
        jobId,
        applicationId,
        eventId: event.eventId,
        correlationId: event.correlationId,
      },
    });
  }

  // Notify Recruiter
  if (job?.recruiter) {
    await NotificationService.createNotification({
      userId: job.recruiter.userId,
      type: 'SYSTEM_ALERT',
      title: 'New Applicant Received',
      message: `${candidate?.name || 'A candidate'} applied for your opening "${job.title}".`,
      metadata: {
        jobId,
        candidateId,
        applicationId,
        eventId: event.eventId,
        correlationId: event.correlationId,
      },
    });
  }
}

export async function handleApplicationStatusChanged(
  event: DomainEvent<ApplicationStatusChangedPayload>
): Promise<void> {
  const { candidateId, jobId, newStatus } = event.payload;
  logger.info(`[NotificationWorker] Handling application.status.changed (NewStatus=${newStatus})`);

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  const candidate = await prisma.candidateProfile.findUnique({ where: { id: candidateId } });

  if (candidate) {
    await NotificationService.createNotification({
      candidateId,
      userId: candidate.userId,
      type: 'APPLICATION_STATUS_CHANGED',
      title: 'Application Status Updated',
      message: `Your application for "${job?.title || 'Position'}" moved to ${newStatus}.`,
      metadata: {
        jobId,
        newStatus,
        eventId: event.eventId,
        correlationId: event.correlationId,
      },
    });
  }
}
