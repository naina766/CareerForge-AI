import { prisma } from '@careerforge/database';
import { DomainEvent, ApplicationCreatedPayload, ApplicationStatusChangedPayload } from '@careerforge/types';
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
    await prisma.notification.create({
      data: {
        userId: candidate.userId,
        type: 'APPLICATION_SUBMITTED',
        title: 'Application Submitted Successfully',
        message: `Your application for "${job?.title || 'Job'}" has been submitted to the recruiting team.`,
      },
    });
  }

  // Notify Recruiter
  if (job?.recruiter) {
    await prisma.notification.create({
      data: {
        userId: job.recruiter.userId,
        type: 'NEW_APPLICANT_RECEIVED',
        title: 'New Applicant Received',
        message: `${candidate?.name || 'A candidate'} applied for your opening "${job.title}".`,
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
    await prisma.notification.create({
      data: {
        userId: candidate.userId,
        type: 'APPLICATION_STATUS_UPDATED',
        title: 'Application Status Updated',
        message: `Your application for "${job?.title || 'Position'}" moved to ${newStatus}.`,
      },
    });
  }
}
