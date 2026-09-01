import { prisma } from '@careerforge/database';
import {
  NotificationItem,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '@careerforge/types';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { MetricsService } from '../../infrastructure/observability/metrics.js';
import { logger } from '../../utils/logger.js';

export interface CreateNotificationInput {
  candidateId?: string | null;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Creates a notification respecting candidate preferences and duplicate suppression.
   */
  static async createNotification(input: CreateNotificationInput): Promise<NotificationItem | null> {
    const channel = input.channel || 'IN_APP';

    // 1. If candidate-scoped, check preferences
    if (input.candidateId) {
      const prefs = await NotificationPreferenceService.getPreferences(input.candidateId);

      if (channel === 'IN_APP' && !prefs.inAppNotifications) {
        logger.info(`[NotificationService] Suppressing in-app notification for candidate ${input.candidateId} (in-app disabled)`);
        return null;
      }

      if (channel === 'EMAIL' && !prefs.emailNotifications) {
        logger.info(`[NotificationService] Suppressing email notification for candidate ${input.candidateId} (email disabled)`);
        return null;
      }

      // Check type-specific preference toggles
      if (input.type === 'MATCH_COMPLETED' && !prefs.matchNotifications) return null;
      if (input.type === 'SKILL_GAP_UPDATED' && !prefs.skillGapNotifications) return null;
      if (input.type === 'LEARNING_PATH_UPDATED' && !prefs.learningNotifications) return null;
      if (input.type === 'APPLICATION_STATUS_CHANGED' && !prefs.applicationNotifications) return null;
      if (input.type === 'JOB_RECOMMENDED' && !prefs.recommendationNotifications) return null;

      // 2. Duplicate suppression (avoid identical alert storm within 60s)
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const existing = await prisma.notification.findFirst({
        where: {
          candidateId: input.candidateId,
          type: input.type,
          title: input.title,
          createdAt: { gte: oneMinuteAgo },
        },
      });

      if (existing) {
        logger.info(`[NotificationService] Suppressing duplicate notification for candidate ${input.candidateId}: "${input.title}"`);
        return null;
      }
    }

    // 3. Persist notification to PostgreSQL
    const notification = await prisma.notification.create({
      data: {
        candidateId: input.candidateId || null,
        userId: input.userId || null,
        type: input.type,
        title: input.title,
        message: input.message,
        status: 'UNREAD',
        channel,
        metadata: (input.metadata || {}) as any,
      },
    });

    MetricsService.recordNotificationCreated();

    return {
      id: notification.id,
      candidateId: notification.candidateId,
      userId: notification.userId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      status: notification.status as NotificationStatus,
      channel: notification.channel as NotificationChannel,
      metadata: (notification.metadata as Record<string, unknown>) || null,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
    };
  }

  /**
   * Retrieves paginated notifications for a candidate with optional filtering.
   */
  static async getCandidateNotifications(
    candidateId: string,
    options?: {
      status?: NotificationStatus;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: NotificationItem[]; total: number; unreadCount: number }> {
    const where: any = { candidateId };
    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;

    const [total, unreadCount, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { candidateId, status: 'UNREAD' } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 30,
        skip: options?.offset ?? 0,
      }),
    ]);

    return {
      total,
      unreadCount,
      items: items.map((n) => ({
        id: n.id,
        candidateId: n.candidateId,
        userId: n.userId,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        status: n.status as NotificationStatus,
        channel: n.channel as NotificationChannel,
        metadata: (n.metadata as Record<string, unknown>) || null,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt ? n.readAt.toISOString() : null,
      })),
    };
  }

  /**
   * Returns count of unread notifications for a candidate.
   */
  static async getUnreadCount(candidateId: string): Promise<number> {
    return await prisma.notification.count({
      where: { candidateId, status: 'UNREAD' },
    });
  }

  /**
   * Marks a specific notification as read.
   */
  static async markAsRead(candidateId: string, notificationId: string): Promise<NotificationItem | null> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, candidateId },
    });

    if (!notification) return null;

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return {
      id: updated.id,
      candidateId: updated.candidateId,
      userId: updated.userId,
      type: updated.type as NotificationType,
      title: updated.title,
      message: updated.message,
      status: updated.status as NotificationStatus,
      channel: updated.channel as NotificationChannel,
      metadata: (updated.metadata as Record<string, unknown>) || null,
      createdAt: updated.createdAt.toISOString(),
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
    };
  }

  /**
   * Marks all UNREAD notifications as READ for a candidate.
   */
  static async markAllAsRead(candidateId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: { candidateId, status: 'UNREAD' },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Deletes / archives a notification.
   */
  static async deleteNotification(candidateId: string, notificationId: string): Promise<boolean> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, candidateId },
    });

    if (!notification) return false;

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return true;
  }
}
