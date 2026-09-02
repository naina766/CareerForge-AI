import { MetricsService } from './metrics.service.js';
import { AlertService } from './alert.service.js';

export interface RoutePerformance {
  method: string;
  route: string;
  count: number;
  errorCount: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export class PerformanceService {
  private static routeSamples = new Map<string, { latencies: number[]; errors: number; total: number }>();

  /**
   * Records an API request execution and updates route percentiles.
   */
  static recordRequest(method: string, route: string, statusCode: number, durationMs: number, correlationId?: string): void {
    const key = `${method.toUpperCase()} ${route}`;
    const entry = this.routeSamples.get(key) || { latencies: [], errors: 0, total: 0 };

    entry.total += 1;
    if (statusCode >= 400) {
      entry.errors += 1;
      MetricsService.increment('api.errors', 1, { method, route, statusCode });
    }
    entry.latencies.push(durationMs);
    if (entry.latencies.length > 500) entry.latencies.shift();

    this.routeSamples.set(key, entry);

    MetricsService.increment('api.requests', 1, { method, route });
    MetricsService.observe('api.request.duration', durationMs, { method, route });

    // Evaluate alerting
    const p95 = this.calculatePercentile(entry.latencies, 95);
    const errorRate = Math.round((entry.errors / entry.total) * 10000) / 100;

    AlertService.evaluateMetric('api', 'api.latency.p95', p95, correlationId);
    AlertService.evaluateMetric('api', 'api.error_rate', errorRate, correlationId);
  }

  /**
   * Retrieves performance analytics across all tracked routes.
   */
  static getRoutePerformance(): RoutePerformance[] {
    const results: RoutePerformance[] = [];

    for (const [key, entry] of this.routeSamples.entries()) {
      const [method, ...rest] = key.split(' ');
      const route = rest.join(' ');

      const sorted = [...entry.latencies].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const avg = sorted.length > 0 ? Math.round((sum / sorted.length) * 100) / 100 : 0;
      const errorRate = entry.total > 0 ? Math.round((entry.errors / entry.total) * 10000) / 100 : 0;

      results.push({
        method,
        route,
        count: entry.total,
        errorCount: entry.errors,
        errorRate,
        avgLatencyMs: avg,
        p50LatencyMs: this.calculatePercentile(sorted, 50),
        p90LatencyMs: this.calculatePercentile(sorted, 90),
        p95LatencyMs: this.calculatePercentile(sorted, 95),
        p99LatencyMs: this.calculatePercentile(sorted, 99),
      });
    }

    return results.sort((a, b) => b.count - a.count);
  }

  private static calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.floor((percentile / 100) * sorted.length);
    return sorted[Math.min(idx, sorted.length - 1)];
  }
}
