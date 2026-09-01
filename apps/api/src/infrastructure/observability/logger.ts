import { logger as baseLogger } from '../../utils/logger.js';

export interface StructuredLogContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  candidateId?: string;
  service?: string;
  durationMs?: number;
  route?: string;
  method?: string;
  statusCode?: number;
  error?: string | Error;
  metadata?: Record<string, unknown>;
}

export class StructuredLogger {
  private static serviceName = 'careerforge-api';

  static info(message: string, context?: StructuredLogContext): void {
    baseLogger.info(message, this.formatContext(context));
  }

  static warn(message: string, context?: StructuredLogContext): void {
    baseLogger.warn(message, this.formatContext(context));
  }

  static error(message: string, context?: StructuredLogContext): void {
    baseLogger.error(message, this.formatContext(context));
  }

  static debug(message: string, context?: StructuredLogContext): void {
    baseLogger.debug(message, this.formatContext(context));
  }

  private static formatContext(context?: StructuredLogContext): Record<string, unknown> {
    if (!context) return { service: this.serviceName };

    const errorDetails = context.error
      ? context.error instanceof Error
        ? { message: context.error.message, stack: context.error.stack }
        : { message: String(context.error) }
      : undefined;

    return {
      service: context.service || this.serviceName,
      requestId: context.requestId,
      correlationId: context.correlationId,
      userId: context.userId,
      candidateId: context.candidateId,
      durationMs: context.durationMs,
      route: context.route,
      method: context.method,
      statusCode: context.statusCode,
      error: errorDetails,
      ...context.metadata,
    };
  }
}
