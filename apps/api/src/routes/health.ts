import { Router, Request, Response } from 'express';
import { prisma } from '@careerforge/database';
import { ApiResponse } from '@careerforge/types';

export const healthRouter: Router = Router();

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
