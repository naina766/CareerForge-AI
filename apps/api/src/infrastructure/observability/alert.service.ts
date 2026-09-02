import { prisma } from '@careerforge/database';
import { AlertSeverity, AlertStatus, SystemAlert } from '@careerforge/types';
import { StructuredLogger } from './logger.js';

export interface CreateAlertDto {
  service: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metricName?: string;
  threshold?: number;
  actualValue?: number;
  correlationId?: string;
}

export class AlertService {
  /**
   * Deterministically evaluates a metric against production thresholds and triggers alerts.
   */
  static async evaluateMetric(
    service: string,
    metricName: string,
    value: number,
    correlationId?: string
  ): Promise<SystemAlert | null> {
    let triggeredSeverity: AlertSeverity | null = null;
    let threshold: number | null = null;
    let title = '';
    let description = '';

    switch (metricName) {
      case 'api.latency.p95':
        if (value > 3000) {
          triggeredSeverity = 'CRITICAL';
          threshold = 3000;
          title = 'Critical API P95 Latency Degradation';
          description = `API P95 latency is ${value}ms exceeding critical threshold of ${threshold}ms.`;
        } else if (value > 1000) {
          triggeredSeverity = 'WARNING';
          threshold = 1000;
          title = 'High API P95 Latency Detected';
          description = `API P95 latency is ${value}ms exceeding warning threshold of ${threshold}ms.`;
        }
        break;

      case 'api.error_rate':
        if (value > 15) {
          triggeredSeverity = 'CRITICAL';
          threshold = 15;
          title = 'Critical API Error Rate Spike';
          description = `API error rate reached ${value}% exceeding critical threshold of ${threshold}%.`;
        } else if (value > 5) {
          triggeredSeverity = 'WARNING';
          threshold = 5;
          title = 'Elevated API Error Rate';
          description = `API error rate reached ${value}% exceeding warning threshold of ${threshold}%.`;
        }
        break;

      case 'kafka.dlq':
        if (value > 0) {
          triggeredSeverity = 'WARNING';
          threshold = 0;
          title = 'Kafka Dead-Letter Queue (DLQ) Event Detected';
          description = `Kafka DLQ contains ${value} dead-letter events requiring operator inspection.`;
        }
        break;

      case 'ai.failure_rate':
        if (value > 10) {
          triggeredSeverity = 'WARNING';
          threshold = 10;
          title = 'AI Service Failure Rate Elevated';
          description = `FastAPI AI service failure rate is ${value}% exceeding threshold of ${threshold}%.`;
        }
        break;

      case 'db.query_latency':
        if (value > 500) {
          triggeredSeverity = 'WARNING';
          threshold = 500;
          title = 'PostgreSQL Query Latency Warning';
          description = `Database query latency is ${value}ms exceeding threshold of ${threshold}ms.`;
        }
        break;

      case 'faiss.latency':
        if (value > 1000) {
          triggeredSeverity = 'WARNING';
          threshold = 1000;
          title = 'FAISS Vector Search Latency Warning';
          description = `FAISS vector search latency is ${value}ms exceeding threshold of ${threshold}ms.`;
        }
        break;
    }

    if (!triggeredSeverity) return null;

    return this.createAlert({
      service,
      severity: triggeredSeverity,
      title,
      description,
      metricName,
      threshold: threshold || undefined,
      actualValue: value,
      correlationId,
    });
  }

  /**
   * Creates an alert in PostgreSQL with duplicate suppression.
   */
  static async createAlert(data: CreateAlertDto): Promise<SystemAlert | null> {
    try {
      // Deduplication: prevent identical active OPEN alerts for the same service + metric within 5 minutes
      const recentExisting = await prisma.systemAlert.findFirst({
        where: {
          service: data.service,
          metricName: data.metricName || undefined,
          status: 'OPEN',
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
      });

      if (recentExisting) {
        StructuredLogger.debug(`Suppressed duplicate alert for ${data.service}:${data.metricName}`);
        return this.mapToModel(recentExisting);
      }

      const alert = await prisma.systemAlert.create({
        data: {
          service: data.service,
          severity: data.severity,
          status: 'OPEN',
          title: data.title,
          description: data.description,
          metricName: data.metricName,
          threshold: data.threshold,
          actualValue: data.actualValue,
          correlationId: data.correlationId,
        },
      });

      StructuredLogger.warn(`[SystemAlert:${data.severity}] ${data.title}`, {
        service: data.service,
        correlationId: data.correlationId,
        metadata: { actualValue: data.actualValue, threshold: data.threshold },
      });

      return this.mapToModel(alert);
    } catch {
      return null;
    }
  }

  /**
   * Fetches alerts from PostgreSQL.
   */
  static async getAlerts(filter: { status?: AlertStatus; severity?: AlertSeverity; service?: string } = {}): Promise<SystemAlert[]> {
    try {
      const where: any = {};
      if (filter.status) where.status = filter.status;
      if (filter.severity) where.severity = filter.severity;
      if (filter.service) where.service = filter.service;

      const alerts = await prisma.systemAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return alerts.map(this.mapToModel);
    } catch {
      return [];
    }
  }

  /**
   * Marks an alert as ACKNOWLEDGED.
   */
  static async acknowledgeAlert(alertId: string): Promise<SystemAlert | null> {
    try {
      const updated = await prisma.systemAlert.update({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
        },
      });
      return this.mapToModel(updated);
    } catch {
      return null;
    }
  }

  /**
   * Marks an alert as RESOLVED.
   */
  static async resolveAlert(alertId: string): Promise<SystemAlert | null> {
    try {
      const updated = await prisma.systemAlert.update({
        where: { id: alertId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      return this.mapToModel(updated);
    } catch {
      return null;
    }
  }

  private static mapToModel(record: any): SystemAlert {
    return {
      id: record.id,
      service: record.service,
      severity: record.severity as AlertSeverity,
      status: record.status as AlertStatus,
      title: record.title,
      description: record.description,
      metricName: record.metricName,
      threshold: record.threshold,
      actualValue: record.actualValue,
      correlationId: record.correlationId,
      createdAt: record.createdAt.toISOString(),
      acknowledgedAt: record.acknowledgedAt ? record.acknowledgedAt.toISOString() : null,
      resolvedAt: record.resolvedAt ? record.resolvedAt.toISOString() : null,
    };
  }
}
