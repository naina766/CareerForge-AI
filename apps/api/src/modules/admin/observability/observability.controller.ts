import { Request, Response, NextFunction } from 'express';
import { prisma } from '@careerforge/database';
import { HealthCheckService } from '../../../infrastructure/observability/health.service.js';
import { MetricsService } from '../../../infrastructure/observability/metrics.js';
import { KafkaHealthService } from '../../../infrastructure/observability/kafka-health.service.js';
import { WorkerExecutionService } from '../../../infrastructure/observability/worker-execution.service.js';
import { ApiResponse, ObservabilitySummary } from '@careerforge/types';

export class AdminObservabilityController {
  /**
   * GET /api/v1/admin/health
   */
  static async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await HealthCheckService.checkSystemHealth();
      const response: ApiResponse<any> = {
        success: true,
        data: health,
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
   * GET /api/v1/admin/metrics
   */
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const global = MetricsService.getGlobalMetrics();
      const routes = MetricsService.getRouteLatencyStats();

      const response: ApiResponse<any> = {
        success: true,
        data: {
          global,
          routes,
        },
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
   * GET /api/v1/admin/workers
   */
  static async getWorkers(req: Request, res: Response, next: NextFunction) {
    try {
      const workerName = req.query.workerName as string;
      const status = req.query.status as any;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const [stats, executions] = await Promise.all([
        WorkerExecutionService.getWorkerStats(),
        WorkerExecutionService.getWorkerExecutions({ workerName, status, limit, offset }),
      ]);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          stats,
          executions: executions.items,
          total: executions.total,
        },
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
   * GET /api/v1/admin/kafka
   */
  static async getKafkaHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const kafkaHealth = await KafkaHealthService.getKafkaHealthReport();
      const response: ApiResponse<any> = {
        success: true,
        data: kafkaHealth,
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
   * GET /api/v1/admin/errors
   */
  static async getErrors(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const [dlqErrors, workerErrors] = await Promise.all([
        prisma.deadLetterEvent.findMany({
          orderBy: { failedAt: 'desc' },
          take: limit,
        }),
        prisma.workerExecution.findMany({
          where: { status: { in: ['FAILED', 'DLQ'] } },
          orderBy: { startedAt: 'desc' },
          take: limit,
        }),
      ]);

      const formattedErrors = [
        ...dlqErrors.map((d) => ({
          id: d.id,
          source: 'DLQ',
          eventId: d.eventId,
          eventType: d.eventType,
          error: d.error,
          stackTrace: d.stackTrace,
          occurredAt: d.failedAt.toISOString(),
          metadata: d.payload,
        })),
        ...workerErrors.map((w) => ({
          id: w.id,
          source: w.workerName,
          eventId: w.eventId,
          eventType: w.eventType,
          error: w.error || 'Unknown worker error',
          stackTrace: w.stackTrace,
          occurredAt: w.startedAt.toISOString(),
          metadata: { attempt: w.attempt, durationMs: w.durationMs },
        })),
      ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

      const response: ApiResponse<any> = {
        success: true,
        data: formattedErrors.slice(0, limit),
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          pagination: {
            page: 1,
            limit,
            total: formattedErrors.length,
            totalPages: Math.ceil(formattedErrors.length / limit) || 1,
            hasNextPage: limit < formattedErrors.length,
            hasPreviousPage: false,
          },
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/system-status
   */
  static async getSystemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const [health, globalMetrics, dlqCount] = await Promise.all([
        HealthCheckService.checkSystemHealth(),
        MetricsService.getGlobalMetrics(),
        prisma.deadLetterEvent.count(),
      ]);

      const routeStats = MetricsService.getRouteLatencyStats();
      const avgLatency =
        routeStats.length > 0
          ? Math.round((routeStats.reduce((acc, r) => acc + r.avgLatencyMs, 0) / routeStats.length) * 100) / 100
          : 45;
      const p95Latency =
        routeStats.length > 0
          ? Math.round((routeStats.reduce((acc, r) => acc + r.p95LatencyMs, 0) / routeStats.length) * 100) / 100
          : 120;

      const services = Object.values(health.services);
      const healthyServices = services.filter((s) => s.status === 'HEALTHY').length;

      const summary: ObservabilitySummary = {
        totalRequests: globalMetrics.totalRequests,
        errorRate: globalMetrics.errorRate,
        avgLatencyMs: avgLatency,
        p95LatencyMs: p95Latency,
        kafkaEventsTotal: globalMetrics.kafkaPublished + globalMetrics.kafkaProcessed,
        dlqTotal: dlqCount,
        workersCount: 3,
        healthyServicesCount: healthyServices,
        totalServicesCount: services.length,
      };

      const response: ApiResponse<ObservabilitySummary> = {
        success: true,
        data: summary,
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
