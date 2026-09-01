import { Request, Response, NextFunction } from 'express';
import { prisma } from '@careerforge/database';
import { z } from 'zod';
import { NotificationService } from './notification.service.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ApiResponse, NotificationItem, NotificationPreference } from '@careerforge/types';

const updatePreferencesSchema = z.object({
  matchNotifications: z.boolean().optional(),
  skillGapNotifications: z.boolean().optional(),
  learningNotifications: z.boolean().optional(),
  applicationNotifications: z.boolean().optional(),
  recommendationNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
});

export class NotificationController {
  private static async getCandidateId(userId: string): Promise<string> {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!candidate) {
      throw new AppError('Candidate profile not found', 404, 'CANDIDATE_NOT_FOUND');
    }
    return candidate.id;
  }

  /**
   * GET /api/v1/notifications
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = await NotificationController.getCandidateId(req.user!.id);
      const status = req.query.status as any;
      const type = req.query.type as any;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await NotificationService.getCandidateNotifications(candidateId, {
        status,
        type,
        limit,
        offset,
      });

      const response: ApiResponse<NotificationItem[]> = {
        success: true,
        data: result.items,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          pagination: {
            page: Math.floor(offset / limit) + 1,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit) || 1,
            hasNextPage: offset + limit < result.total,
            hasPreviousPage: offset > 0,
          },
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   */
  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = await NotificationController.getCandidateId(req.user!.id);
      const count = await NotificationService.getUnreadCount(candidateId);

      const response: ApiResponse<{ count: number }> = {
        success: true,
        data: { count },
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = await NotificationController.getCandidateId(req.user!.id);
      const { id } = req.params;

      const notification = await NotificationService.markAsRead(candidateId, id);
      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      const response: ApiResponse<NotificationItem> = {
        success: true,
        data: notification,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = await NotificationController.getCandidateId(req.user!.id);
      const result = await NotificationService.markAllAsRead(candidateId);

      const response: ApiResponse<{ updatedCount: number }> = {
        success: true,
        data: { updatedCount: result.count },
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   */
  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = await NotificationController.getCandidateId(req.user!.id);
      const { id } = req.params;

      const success = await NotificationService.deleteNotification(candidateId, id);
      if (!success) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      const response: ApiResponse<{ deleted: boolean }> = {
        success: true,
        data: { deleted: true },
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/notifications/preferences
   */
  static async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = await NotificationController.getCandidateId(req.user!.id);
      const prefs = await NotificationPreferenceService.getPreferences(candidateId);

      const response: ApiResponse<NotificationPreference> = {
        success: true,
        data: prefs,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/preferences
   */
  static async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = await NotificationController.getCandidateId(req.user!.id);
      const validated = updatePreferencesSchema.parse(req.body);

      const updated = await NotificationPreferenceService.updatePreferences(candidateId, validated);

      const response: ApiResponse<NotificationPreference> = {
        success: true,
        data: updated,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
