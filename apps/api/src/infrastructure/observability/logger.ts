import { logger as baseLogger } from '../../utils/logger.js';

export interface StructuredLogContext {
  requestId?: string;
  correlationId?: string;
  causationId?: string;
  eventId?: string;
  userId?: string;
  candidateId?: string;
  jobId?: string;
  service?: string;
  event?: string;
  durationMs?: number;
  route?: string;
  method?: string;
  statusCode?: number;
  error?: string | Error;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'apikey',
  'cookie',
  'parsedtext',
  'resumetext',
  'rawtext',
  'database_url',
  'jwt_secret',
]);

export class StructuredLogger {
  private static serviceName = 'careerforge-api';

  static info(message: string, context?: StructuredLogContext): void {
    baseLogger.info(message, this.sanitize(this.formatContext(context)));
  }

  static warn(message: string, context?: StructuredLogContext): void {
    baseLogger.warn(message, this.sanitize(this.formatContext(context)));
  }

  static error(message: string, context?: StructuredLogContext): void {
    baseLogger.error(message, this.sanitize(this.formatContext(context)));
  }

  static debug(message: string, context?: StructuredLogContext): void {
    baseLogger.debug(message, this.sanitize(this.formatContext(context)));
  }

  /**
   * Recursively redacts sensitive fields from logged objects.
   */
  static sanitize(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private static formatContext(context?: StructuredLogContext): Record<string, unknown> {
    if (!context) return { service: this.serviceName, timestamp: new Date().toISOString() };

    const errorDetails = context.error
      ? context.error instanceof Error
        ? { message: context.error.message, stack: context.error.stack }
        : { message: String(context.error) }
      : undefined;

    return {
      service: context.service || this.serviceName,
      timestamp: new Date().toISOString(),
      event: context.event,
      requestId: context.requestId,
      correlationId: context.correlationId,
      causationId: context.causationId,
      eventId: context.eventId,
      userId: context.userId,
      candidateId: context.candidateId,
      jobId: context.jobId,
      durationMs: context.durationMs,
      route: context.route,
      method: context.method,
      statusCode: context.statusCode,
      error: errorDetails,
      ...context.metadata,
    };
  }
}
