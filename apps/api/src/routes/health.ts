import { Router, Request, Response } from 'express';
import { prisma } from '@careerforge/database';
import { getRedisClient } from '../infrastructure/redis/redis.client.js';
import { ApiResponse } from '@careerforge/types';

export const healthRouter: Router = Router();

/**
 * GET /live - Lightweight Liveness Probe
 */
healthRouter.get('/live', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'alive', uptime: process.uptime() });
});

/**
 * GET /health - Basic Process Health Probe
 */
healthRouter.get('/health', async (req: Request, res: Response): Promise<void> => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRawUnsafe('SELECT 1;');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const response: ApiResponse<{
    status: string;
    service: string;
    version: string;
    database: string;
    uptime: number;
    environment: string;
  }> = {
    success: true,
    data: {
      status: 'ok',
      service: 'api',
      version: '1.0.0',
      database: dbStatus,
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
    },
    meta: {
      correlationId: req.correlationId,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(200).json(response);
});

/**
 * GET /ready - Deep Readiness Probe
 */
healthRouter.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  let isDbReady = false;
  let isRedisReady = false;

  try {
    await prisma.$queryRawUnsafe('SELECT 1;');
    isDbReady = true;
  } catch {
    isDbReady = false;
  }

  try {
    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      await redis.ping();
      isRedisReady = true;
    }
  } catch {
    isRedisReady = false;
  }

  const isReady = isDbReady; // DB is critical for readiness; Redis operates with fallback

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    dependencies: {
      database: isDbReady ? 'connected' : 'unreachable',
      redis: isRedisReady ? 'connected' : 'degraded_fallback',
    },
    timestamp: new Date().toISOString(),
  });
});
