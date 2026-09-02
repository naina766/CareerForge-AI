import { TraceSpan, TraceTimeline } from '@careerforge/types';
import { StructuredLogger } from './logger.js';

export interface TraceContext {
  traceId: string;
  correlationId?: string;
  requestId?: string;
  eventId?: string;
  causationId?: string;
}

export class TracingService {
  private static spans = new Map<string, TraceSpan[]>();
  private static traceContexts = new Map<string, TraceContext>();

  /**
   * Registers a trace context (linking correlationId, requestId, eventId).
   */
  static registerContext(context: TraceContext): void {
    if (!context.traceId) return;
    this.traceContexts.set(context.traceId, context);
    if (context.correlationId && context.correlationId !== context.traceId) {
      this.traceContexts.set(context.correlationId, context);
    }
    if (context.requestId && context.requestId !== context.traceId) {
      this.traceContexts.set(context.requestId, context);
    }
    if (context.eventId && context.eventId !== context.traceId) {
      this.traceContexts.set(context.eventId, context);
    }
  }

  /**
   * Records a span in the distributed trace.
   */
  static recordSpan(traceIdOrCorrelationId: string, span: Omit<TraceSpan, 'timestamp'> & { timestamp?: string }): void {
    if (!traceIdOrCorrelationId) return;

    // Resolve trace context if mapped
    const ctx = this.traceContexts.get(traceIdOrCorrelationId);
    const traceId = ctx?.traceId || traceIdOrCorrelationId;

    const currentSpans = this.spans.get(traceId) || [];
    const completeSpan: TraceSpan = {
      ...span,
      timestamp: span.timestamp || new Date().toISOString(),
    };

    currentSpans.push(completeSpan);
    if (currentSpans.length > 50) currentSpans.shift();
    this.spans.set(traceId, currentSpans);

    StructuredLogger.debug(`Span recorded: ${span.name} (${span.service})`, {
      correlationId: traceId,
      eventId: ctx?.eventId,
      requestId: ctx?.requestId,
      durationMs: span.durationMs,
      metadata: span.metadata,
    });
  }

  /**
   * Retrieves the full timeline and spans for a given trace/correlation/request ID.
   */
  static getTraceTimeline(identifier: string): TraceTimeline | null {
    const ctx = this.traceContexts.get(identifier);
    const traceId = ctx?.traceId || identifier;
    const spans = this.spans.get(traceId) || [];

    if (spans.length === 0 && !ctx) {
      return null;
    }

    const sortedSpans = [...spans].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const totalDurationMs = sortedSpans.reduce((sum, s) => sum + (s.durationMs || 0), 0);
    const hasError = sortedSpans.some((s) => s.status === 'ERROR');

    return {
      traceId,
      correlationId: ctx?.correlationId || traceId,
      requestId: ctx?.requestId,
      eventId: ctx?.eventId,
      totalDurationMs,
      status: hasError ? 'ERROR' : 'SUCCESS',
      spans: sortedSpans,
      metadata: {
        totalSpans: sortedSpans.length,
        services: Array.from(new Set(sortedSpans.map((s) => s.service))),
      },
    };
  }

  /**
   * Returns recent trace IDs for exploration.
   */
  static getRecentTraces(): string[] {
    return Array.from(this.spans.keys()).slice(-20).reverse();
  }
}
