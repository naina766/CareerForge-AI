import { HealthCheckService } from '../../infrastructure/observability/health.service.js';
import { MetricsService, MetricFilter } from '../../infrastructure/observability/metrics.service.js';
import { AlertService } from '../../infrastructure/observability/alert.service.js';
import { TracingService } from '../../infrastructure/observability/tracing.service.js';
import { PerformanceService } from '../../infrastructure/observability/performance.service.js';
import { KafkaHealthService } from '../../infrastructure/observability/kafka-health.service.js';
import { WorkerExecutionService } from '../../infrastructure/observability/worker-execution.service.js';
import { AlertStatus, AlertSeverity } from '@careerforge/types';

export class ObservabilityService {
  /**
   * Returns high-level public system health.
   */
  static async getSystemHealth() {
    return HealthCheckService.checkSystemHealth();
  }

  /**
   * Lightweight liveness probe.
   */
  static getLiveness() {
    return {
      status: 'UP',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Deep readiness probe checking primary DB and core state.
   */
  static async getReadiness() {
    const health = await HealthCheckService.checkSystemHealth();
    const isReady = health.status !== 'UNHEALTHY';
    return {
      ready: isReady,
      status: health.status,
      services: health.services,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Aggregates complete admin telemetry.
   */
  static async getAdminSummary() {
    const [health, kafkaStats, workers, alerts, performance] = await Promise.all([
      HealthCheckService.checkSystemHealth(),
      KafkaHealthService.getKafkaHealthReport(),
      WorkerExecutionService.getWorkerStats(),
      AlertService.getAlerts({ status: 'OPEN' }),
      PerformanceService.getRoutePerformance(),
    ]);

    const counters = MetricsService.getCounters();
    const totalRequests = counters['api.requests'] || 0;
    const totalErrors = counters['api.errors'] || 0;
    const errorRate = totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0;

    const requestDuration = MetricsService.getHistogramSummary('api.request.duration');

    return {
      health,
      summary: {
        totalRequests,
        totalErrors,
        errorRate,
        avgLatencyMs: requestDuration.avg,
        p50LatencyMs: requestDuration.p50,
        p95LatencyMs: requestDuration.p95,
        p99LatencyMs: requestDuration.p99,
        kafkaEventsPublished: kafkaStats.outboxStats.published,
        kafkaEventsFailed: kafkaStats.outboxStats.failed,
        dlqCount: kafkaStats.dlqStats.total,
        openAlertsCount: alerts.length,
      },
      routes: performance,
      kafka: kafkaStats,
      workers,
      activeAlerts: alerts,
    };
  }

  /**
   * Queries system metrics with filters.
   */
  static async getMetrics(filter: MetricFilter) {
    const historical = await MetricsService.queryMetrics(filter);
    const counters = MetricsService.getCounters();
    const gauges = MetricsService.getGauges();
    const apiLatency = MetricsService.getHistogramSummary('api.request.duration');

    return {
      historical,
      current: {
        counters,
        gauges,
        latencyHistograms: {
          api: apiLatency,
        },
      },
    };
  }

  /**
   * Retrieves alerts.
   */
  static async getAlerts(filter: { status?: AlertStatus; severity?: AlertSeverity; service?: string }) {
    return AlertService.getAlerts(filter);
  }

  /**
   * Acknowledges an alert.
   */
  static async acknowledgeAlert(alertId: string) {
    return AlertService.acknowledgeAlert(alertId);
  }

  /**
   * Resolves an alert.
   */
  static async resolveAlert(alertId: string) {
    return AlertService.resolveAlert(alertId);
  }

  /**
   * Retrieves distributed trace timeline.
   */
  static getTraceTimeline(traceId: string) {
    return TracingService.getTraceTimeline(traceId);
  }

  /**
   * Returns recent trace identifiers.
   */
  static getRecentTraces() {
    return TracingService.getRecentTraces();
  }
}
