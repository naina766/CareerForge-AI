import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@careerforge/config';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeadersMiddleware } from './infrastructure/security/security-headers.js';
import { inputSanitizerMiddleware } from './infrastructure/security/input-sanitizer.js';
import { healthRouter } from './routes/health.js';
import { apiV1Router } from './routes/index.js';
import { ObservabilityController } from './modules/observability/observability.controller.js';

export function createServer(): Express {
  const app = express();

  // Security headers & helmet
  app.use(helmet());
  app.use(securityHeadersMiddleware);

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
    })
  );

  // Cookie parser for HTTP-only refresh tokens
  app.use(cookieParser());

  // Body parsers with request size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization against XSS & script injection
  app.use(inputSanitizerMiddleware);

  // Correlation ID and distributed request tracing
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // Root Orchestration Probes (Kubernetes / Docker Compose / Load Balancer)
  app.get('/live', ObservabilityController.getLiveness);
  app.get('/ready', ObservabilityController.getReadiness);
  app.get('/health', ObservabilityController.getSystemHealth);
  app.use('/', healthRouter);

  // Versioned API routes
  app.use('/api/v1', apiV1Router);

  // Centralized Error Handling with production sanitization
  app.use(errorHandler);

  return app;
}
