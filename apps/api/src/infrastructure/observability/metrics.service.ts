import { prisma } from '@careerforge/database';
import { SystemMetric } from '@careerforge/types';

export interface MetricFilter {
  service?: string;
  metricName?: string;
  from?: string;
  to?: string;
}

export interface RouteLatencyStats {
  route: string;
  method: string;
  count: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

export class MetricsService {
  private static counters = new Map<string, number>();
  private static gauges = new Map<string, number>();
  private static histograms = new Map<string, number[]>();
  private static requestCounts = new Map<string, number>();
  private static errorCounts = new Map<string, number>();
  private static latencies = new Map<string, number[]>();
  private static readonly MAX_LATENCY_SAMPLES = 500;

  // Global counters
  private static totalRequests = 0;
  private static totalErrors = 0;
  private static kafkaPublished = 0;
  private static kafkaProcessed = 0;
  private static kafkaFailed = 0;
  private static kafkaDlq = 0;
  private static notificationsCreated = 0;

  /**
   * Records an HTTP request duration and status code.
   */
  static recordHttpRequest(method: string, route: string, durationMs: number, statusCode: number): void {
    this.totalRequests++;
    const key = `${method.toUpperCase()} ${route}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    if (statusCode >= 400) {
      this.totalErrors++;
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }

    const samples = this.latencies.get(key) || [];
    samples.push(durationMs);
    if (samples.length > this.MAX_LATENCY_SAMPLES) {
      samples.shift();
    }
    this.latencies.set(key, samples);
    this.observe('api.request.duration', durationMs, { method, route });
  }

  static recordKafkaPublished(count = 1): void {
    this.kafkaPublished += count;
    this.increment('kafka.events.published', count);
  }

  static recordKafkaProcessed(count = 1): void {
    this.kafkaProcessed += count;
    this.increment('kafka.events.processed', count);
  }

  static recordKafkaFailed(count = 1): void {
    this.kafkaFailed += count;
    this.increment('kafka.events.failed', count);
  }

  static recordKafkaDlq(count = 1): void {
    this.kafkaDlq += count;
    this.increment('kafka.dlq', count);
  }

  static recordNotificationCreated(count = 1): void {
    this.notificationsCreated += count;
  }

  /**
   * Increments a counter metric.
   */
  static increment(metricName: string, value = 1, labels: Record<string, unknown> = {}, service = 'careerforge-api'): void {
    const current = this.counters.get(metricName) || 0;
    this.counters.set(metricName, current + value);
    this.persistMetricAsync(service, metricName, current + value, 'count', labels);
  }

  /**
   * Sets a gauge metric value.
   */
  static set(metricName: string, value: number, labels: Record<string, unknown> = {}, service = 'careerforge-api'): void {
    this.gauges.set(metricName, value);
    this.persistMetricAsync(service, metricName, value, 'gauge', labels);
  }

  /**
   * Observes a sample value in a histogram.
   */
  static observe(metricName: string, value: number, labels: Record<string, unknown> = {}, service = 'careerforge-api'): void {
    const samples = this.histograms.get(metricName) || [];
    samples.push(value);
    if (samples.length > this.MAX_LATENCY_SAMPLES) samples.shift();
    this.histograms.set(metricName, samples);
    this.persistMetricAsync(service, metricName, value, 'ms', labels);
  }

  static getCounters(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }

  static getGauges(): Record<string, number> {
    return Object.fromEntries(this.gauges.entries());
  }

  static getHistogramSummary(metricName: string): { count: number; avg: number; p50: number; p90: number; p95: number; p99: number } {
    const samples = this.histograms.get(metricName) || [];
    if (samples.length === 0) {
      return { count: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / sorted.length) * 100) / 100;

    const p = (pct: number) => {
      const idx = Math.floor((pct / 100) * sorted.length);
      return sorted[Math.min(idx, sorted.length - 1)];
    };

    return {
      count: sorted.length,
      avg,
      p50: p(50),
      p90: p(90),
      p95: p(95),
      p99: p(99),
    };
  }

  static async persistMetric(metricName: string, metricValue: number, service = 'api', metadata: Record<string, unknown> = {}): Promise<void> {
    await this.persistMetricAsync(service, metricName, metricValue, undefined, metadata);
  }

  static getRouteLatencyStats(): RouteLatencyStats[] {
    const stats: RouteLatencyStats[] = [];

    for (const [key, samples] of this.latencies.entries()) {
      if (samples.length === 0) continue;
      const [method, route] = key.split(' ');
      const sorted = [...samples].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const avg = Math.round((sum / sorted.length) * 100) / 100;

      stats.push({
        route,
        method,
        count: this.requestCounts.get(key) || samples.length,
        avgLatencyMs: avg,
        p50LatencyMs: this.getPercentile(sorted, 50),
        p90LatencyMs: this.getPercentile(sorted, 90),
        p95LatencyMs: this.getPercentile(sorted, 95),
        minLatencyMs: sorted[0],
        maxLatencyMs: sorted[sorted.length - 1],
      });
    }

    return stats.sort((a, b) => b.count - a.count);
  }

  static getGlobalMetrics() {
    const errorRate = this.totalRequests > 0
      ? Math.round((this.totalErrors / this.totalRequests) * 10000) / 100
      : 0;

    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRate,
      kafkaPublished: this.kafkaPublished,
      kafkaProcessed: this.kafkaProcessed,
      kafkaFailed: this.kafkaFailed,
      kafkaDlq: this.kafkaDlq,
      notificationsCreated: this.notificationsCreated,
    };
  }

  static async queryMetrics(filter: MetricFilter = {}): Promise<SystemMetric[]> {
    try {
      const where: any = {};
      if (filter.service) where.service = filter.service;
      if (filter.metricName) where.metricName = filter.metricName;
      if (filter.from || filter.to) {
        where.recordedAt = {};
        if (filter.from) where.recordedAt.gte = new Date(filter.from);
        if (filter.to) where.recordedAt.lte = new Date(filter.to);
      }

      const records = await prisma.systemMetric.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        take: 100,
      });

      return records.map((r) => ({
        id: r.id,
        service: r.service,
        metricName: r.metricName,
        value: r.value,
        unit: r.unit || undefined,
        labels: (r.labels as Record<string, unknown>) || {},
        recordedAt: r.recordedAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  private static async persistMetricAsync(
    service: string,
    metricName: string,
    value: number,
    unit?: string,
    labels: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await prisma.systemMetric.create({
        data: {
          service,
          metricName,
          value,
          unit,
          labels: labels as any,
        },
      });
    } catch {
      // Non-blocking telemetry persistence
    }
  }

  private static getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, Math.min(index, sorted.length - 1))] * 100) / 100;
  }
}
