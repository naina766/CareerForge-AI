import { Request, Response, NextFunction } from 'express';
import { prisma } from '@careerforge/database';
import {
  ApiResponse,
  EventStatsResponse,
  EventListResponse,
  DeadLetterEventItem,
} from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';
import { KafkaProducerService } from '../../infrastructure/kafka/kafka.producer.js';

export class AdminEventController {
  /**
   * GET /api/v1/admin/events/stats
   */
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [totalPublished, totalPending, totalFailed, totalProcessed, totalDlq, outboxTopics] = await Promise.all([
        prisma.outboxEvent.count({ where: { status: 'PUBLISHED' } }),
        prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
        prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
        prisma.processedEvent.count(),
        prisma.deadLetterEvent.count(),
        prisma.outboxEvent.groupBy({
          by: ['topic'],
          _count: { topic: true },
        }),
      ]);

      const topicBreakdown: Record<string, number> = {};
      for (const t of outboxTopics) {
        topicBreakdown[t.topic] = t._count.topic;
      }

      const data: EventStatsResponse = {
        totalPublished,
        totalPending,
        totalProcessed,
        totalFailed,
        totalDlq,
        topicBreakdown,
      };

      const response: ApiResponse<EventStatsResponse> = {
        success: true,
        data,
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
   * GET /api/v1/admin/events
   */
  static async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      const { status, topic, eventType } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (topic) where.topic = topic;
      if (eventType) where.eventType = { contains: eventType as string, mode: 'insensitive' };

      const [total, items] = await Promise.all([
        prisma.outboxEvent.count({ where }),
        prisma.outboxEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const data: EventListResponse = {
        items: items.map((i) => ({
          id: i.id,
          eventId: i.eventId,
          eventType: i.eventType,
          topic: i.topic,
          aggregateType: i.aggregateType,
          aggregateId: i.aggregateId,
          payload: i.payload,
          status: i.status,
          attempts: i.attempts,
          maxAttempts: i.maxAttempts,
          lastError: i.lastError,
          availableAt: i.availableAt.toISOString(),
          publishedAt: i.publishedAt?.toISOString() || null,
          createdAt: i.createdAt.toISOString(),
          updatedAt: i.updatedAt.toISOString(),
        })),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      };

      const response: ApiResponse<EventListResponse> = {
        success: true,
        data,
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
   * GET /api/v1/admin/events/dlq
   */
  static async listDLQ(req: Request, res: Response, next: NextFunction) {
    try {
      const dlqItems = await prisma.deadLetterEvent.findMany({
        orderBy: { failedAt: 'desc' },
        take: 50,
      });

      const data: DeadLetterEventItem[] = dlqItems.map((d) => ({
        id: d.id,
        eventId: d.eventId,
        eventType: d.eventType,
        topic: d.topic,
        consumerGroup: d.consumerGroup,
        payload: d.payload,
        error: d.error,
        stackTrace: d.stackTrace,
        attempts: d.attempts,
        failedAt: d.failedAt.toISOString(),
      }));

      const response: ApiResponse<DeadLetterEventItem[]> = {
        success: true,
        data,
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
   * POST /api/v1/admin/events/dlq/:eventId/retry
   */
  static async retryDLQEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;

      const dlqEvent = await prisma.deadLetterEvent.findUnique({
        where: { eventId },
      });

      if (!dlqEvent) {
        throw new AppError('DLQ Event not found', 404, 'DLQ_EVENT_NOT_FOUND');
      }

      // Re-publish original payload to target topic
      await KafkaProducerService.publish(dlqEvent.topic, {
        eventId: dlqEvent.eventId,
        eventType: dlqEvent.eventType as any,
        version: '1.0',
        occurredAt: new Date().toISOString(),
        producer: 'careerforge-admin-retry',
        correlationId: req.correlationId || 'admin-retry',
        aggregateType: 'DLQRetry',
        aggregateId: dlqEvent.eventId,
        payload: dlqEvent.payload as any,
      });

      // Remove from DeadLetterEvent table upon successful retry trigger
      await prisma.deadLetterEvent.delete({
        where: { eventId },
      });

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: `DLQ event ${eventId} re-queued successfully for ${dlqEvent.topic}` },
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
