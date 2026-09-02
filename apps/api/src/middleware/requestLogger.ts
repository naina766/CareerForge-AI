import { Request, Response, NextFunction } from 'express';
import { StructuredLogger } from '../infrastructure/observability/logger.js';
import { MetricsService } from '../infrastructure/observability/metrics.js';
import { PerformanceService } from '../infrastructure/observability/performance.service.js';
import { TracingService } from '../infrastructure/observability/tracing.service.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || req.requestId || `req_${Date.now()}`;
  const correlationId = (req.headers['x-correlation-id'] as string) || req.correlationId || requestId;

  // Register distributed trace context
  TracingService.registerContext({
    traceId: correlationId,
    correlationId,
    requestId,
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    const cleanRoute = originalUrl.split('?')[0];

    // Record metrics & route performance percentiles
    MetricsService.recordHttpRequest(method, cleanRoute, duration, statusCode);
    PerformanceService.recordRequest(method, cleanRoute, statusCode, duration, correlationId);

    // Record root span in TracingService
    TracingService.recordSpan(correlationId, {
      spanId: `span_http_${Date.now()}`,
      name: `HTTP ${method} ${cleanRoute}`,
      service: 'careerforge-api',
      durationMs: duration,
      status: statusCode >= 400 ? 'ERROR' : 'SUCCESS',
      metadata: {
        statusCode,
        method,
        route: cleanRoute,
      },
    });

    const logData = {
      requestId,
      correlationId,
      method,
      route: cleanRoute,
      statusCode,
      durationMs: duration,
      userId: req.user?.id,
      candidateId: (req as any).candidateId,
    };

    if (statusCode >= 500) {
      StructuredLogger.error(`HTTP ${method} ${cleanRoute} ${statusCode} - ${duration}ms`, logData);
    } else if (statusCode >= 400) {
      StructuredLogger.warn(`HTTP ${method} ${cleanRoute} ${statusCode} - ${duration}ms`, logData);
    } else {
      StructuredLogger.info(`HTTP ${method} ${cleanRoute} ${statusCode} - ${duration}ms`, logData);
    }
  });

  next();
};
