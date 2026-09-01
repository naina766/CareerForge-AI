import { prisma } from '@careerforge/database';

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
  }

  static recordKafkaPublished(count = 1): void {
    this.kafkaPublished += count;
  }

  static recordKafkaProcessed(count = 1): void {
    this.kafkaProcessed += count;
  }

  static recordKafkaFailed(count = 1): void {
    this.kafkaFailed += count;
  }

  static recordKafkaDlq(count = 1): void {
    this.kafkaDlq += count;
  }

  static recordNotificationCreated(count = 1): void {
    this.notificationsCreated += count;
  }

  /**
   * Persists a system metric to PostgreSQL SystemMetric table.
   */
  static async persistMetric(metricName: string, metricValue: number, service = 'api', metadata: Record<string, unknown> = {}): Promise<void> {
    try {
      await prisma.systemMetric.create({
        data: {
          metricName,
          metricValue,
          service,
          metadata: metadata as any,
        },
      });
    } catch {
      // Non-blocking telemetry write
    }
  }

  /**
   * Calculates percentile statistics for all tracked routes.
   */
  static getRouteLatencyStats(): RouteLatencyStats[] {
    const stats: RouteLatencyStats[] = [];

    for (const [key, samples] of this.latencies.entries()) {
      if (samples.length === 0) continue;
      const [method, route] = key.split(' ');
      const sorted = [...samples].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const avg = Math.round((sum / sorted.length) * 100) / 100;
      const p50 = this.getPercentile(sorted, 50);
      const p90 = this.getPercentile(sorted, 90);
      const p95 = this.getPercentile(sorted, 95);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      stats.push({
        route,
        method,
        count: this.requestCounts.get(key) || samples.length,
        avgLatencyMs: avg,
        p50LatencyMs: p50,
        p90LatencyMs: p90,
        p95LatencyMs: p95,
        minLatencyMs: min,
        maxLatencyMs: max,
      });
    }

    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Returns global system performance and telemetry metrics.
   */
  static getGlobalMetrics(): {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    kafkaPublished: number;
    kafkaProcessed: number;
    kafkaFailed: number;
    kafkaDlq: number;
    notificationsCreated: number;
  } {
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

  private static getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, Math.min(index, sorted.length - 1))] * 100) / 100;
  }
}
