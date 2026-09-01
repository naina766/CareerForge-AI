import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '@careerforge/types';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR',
    public details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const correlationId = req.correlationId;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      meta: {
        correlationId,
        timestamp: new Date().toISOString()
      }
    };

    logger.warn('Validation error occurred', { correlationId, errors: errorResponse.error.details });
    res.status(400).json(errorResponse);
    return;
  }

  // Handle Known Application Errors
  if (err instanceof AppError) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      },
      meta: {
        correlationId,
        timestamp: new Date().toISOString()
      }
    };

    logger.warn(`AppError: ${err.message}`, { correlationId, code: err.code, statusCode: err.statusCode });
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle Unhandled Internal Server Errors
  logger.error('Unhandled internal exception', {
    correlationId,
    error: err.message,
    stack: err.stack
  });

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    },
    meta: {
      correlationId,
      timestamp: new Date().toISOString()
    }
  };

  res.status(500).json(errorResponse);
};
