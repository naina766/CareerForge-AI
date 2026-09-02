import { Request, Response, NextFunction } from 'express';
import { ObservabilityService } from './observability.service.js';
import { ApiResponse } from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';

export class ObservabilityController {
  /**
   * GET /api/v1/health/system
   * Public health status endpoint.
   */
  static async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ObservabilityService.getSystemHealth();
      const response: ApiResponse<typeof data> = {
        success: true,
        data,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(data.status === 'UNHEALTHY' ? 503 : 200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /live (or /api/v1/live)
   * Process liveness probe.
   */
  static getLiveness(_req: Request, res: Response) {
    const data = ObservabilityService.getLiveness();
    res.status(200).json({ success: true, data });
  }

  /**
   * GET /ready (or /api/v1/ready)
   * Dependency readiness probe.
   */
  static async getReadiness(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ObservabilityService.getReadiness();
      res.status(data.ready ? 200 : 503).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/observability/health
   * Detailed service health for administrators.
   */
  static async getAdminHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ObservabilityService.getSystemHealth();
      const response: ApiResponse<typeof data> = {
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
   * GET /api/v1/admin/observability/summary
   * Consolidated admin observability dashboard summary.
   */
  static async getAdminSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ObservabilityService.getAdminSummary();
      const response: ApiResponse<typeof data> = {
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
   * GET /api/v1/admin/observability/metrics
   */
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = {
        service: req.query.service as string | undefined,
        metricName: req.query.metric as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      };

      const data = await ObservabilityService.getMetrics(filter);
      const response: ApiResponse<typeof data> = {
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
   * GET /api/v1/admin/observability/alerts
   */
  static async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = {
        status: req.query.status as any,
        severity: req.query.severity as any,
        service: req.query.service as string | undefined,
      };

      const data = await ObservabilityService.getAlerts(filter);
      const response: ApiResponse<typeof data> = {
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
   * PATCH /api/v1/admin/observability/alerts/:alertId/acknowledge
   */
  static async acknowledgeAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertId } = req.params;
      const data = await ObservabilityService.acknowledgeAlert(alertId);
      if (!data) {
        throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
      }

      const response: ApiResponse<typeof data> = {
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
   * PATCH /api/v1/admin/observability/alerts/:alertId/resolve
   */
  static async resolveAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertId } = req.params;
      const data = await ObservabilityService.resolveAlert(alertId);
      if (!data) {
        throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
      }

      const response: ApiResponse<typeof data> = {
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
   * GET /api/v1/admin/observability/traces/:traceId
   */
  static getTraceTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const { traceId } = req.params;
      const data = ObservabilityService.getTraceTimeline(traceId);
      if (!data) {
        throw new AppError(`Trace ${traceId} not found or expired`, 404, 'TRACE_NOT_FOUND');
      }

      const response: ApiResponse<typeof data> = {
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
   * GET /api/v1/admin/observability/traces
   */
  static getRecentTraces(req: Request, res: Response) {
    const data = ObservabilityService.getRecentTraces();
    res.status(200).json({
      success: true,
      data,
      meta: {
        requestId: req.requestId,
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
