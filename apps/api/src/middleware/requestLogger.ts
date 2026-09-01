import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, correlationId } = req;
    const { statusCode } = res;

    const logData = {
      correlationId,
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip: req.ip
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`, logData);
    } else {
      logger.info(`HTTP ${method} ${originalUrl} ${statusCode} - ${duration}ms`, logData);
    }
  });

  next();
};
