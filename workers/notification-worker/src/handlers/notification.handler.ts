import { prisma } from '@careerforge/database';
import { DomainEvent, NotificationRequestedPayload } from '@careerforge/types';
import { logger } from '../../../../apps/api/src/utils/logger.js';

export async function handleNotificationRequested(event: DomainEvent<NotificationRequestedPayload>): Promise<void> {
  const { userId, type, title, message } = event.payload;
  logger.info(`[NotificationWorker] Persisting notification for user ${userId}: "${title}"`);

  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
    },
  });
}
