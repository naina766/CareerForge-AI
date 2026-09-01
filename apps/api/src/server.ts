import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@careerforge/config';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { apiV1Router } from './routes/index.js';

export function createServer(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

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

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Correlation ID and request tracing
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // Root health endpoint (for orchestrators / load balancers)
  app.use('/', healthRouter);

  // Versioned API routes
  app.use('/api/v1', apiV1Router);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
