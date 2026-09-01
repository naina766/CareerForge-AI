import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      requestId: string;
    }
  }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingCorrelationId = (req.headers['x-correlation-id'] || req.headers['x-request-id']) as string | undefined;
  const correlationId = incomingCorrelationId || `req_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const requestId = `rq_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  req.correlationId = correlationId;
  req.requestId = requestId;

  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', requestId);

  next();
};
