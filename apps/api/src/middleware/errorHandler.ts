import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '@careerforge/types';
import { StructuredLogger } from '../infrastructure/observability/logger.js';

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
  const correlationId = req.correlationId || (req.headers['x-correlation-id'] as string) || req.requestId;
  const requestId = req.requestId || (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const isProduction = process.env.NODE_ENV === 'production';

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      meta: {
        requestId,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };

    StructuredLogger.warn('Validation error occurred', {
      requestId,
      correlationId,
      metadata: { errors: errorResponse.error.details },
    });
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
        details: err.details,
      },
      meta: {
        requestId,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };

    StructuredLogger.warn(`AppError [${err.code}]: ${err.message}`, {
      requestId,
      correlationId,
      statusCode: err.statusCode,
      metadata: { code: err.code },
    });
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle Database / Prisma / Unhandled internal exceptions
  StructuredLogger.error('Unhandled internal server error', {
    requestId,
    correlationId,
    error: err,
  });

  const isPrismaOrDbError =
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientValidationError' ||
    err.message?.includes('prisma') ||
    err.message?.includes('SELECT') ||
    err.message?.includes('INSERT');

  const sanitizedMessage =
    isProduction || isPrismaOrDbError
      ? 'An unexpected error occurred while processing your request.'
      : err.message || 'Internal server error';

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: sanitizedMessage,
    },
    meta: {
      requestId,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(500).json(errorResponse);
};
