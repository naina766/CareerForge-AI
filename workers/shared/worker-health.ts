export interface WorkerHealthSnapshot {
  workerName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptimeSeconds: number;
  lastProcessedEventId?: string;
  lastProcessedEventType?: string;
  lastProcessedAt?: string;
  lastFailureAt?: string;
  lastFailureError?: string;
  processedCount: number;
  failedCount: number;
  errorRate: number;
}

export class WorkerHealthTracker {
  private workerName: string;
  private startTime = Date.now();
  private processedCount = 0;
  private failedCount = 0;
  private lastProcessedEventId?: string;
  private lastProcessedEventType?: string;
  private lastProcessedAt?: string;
  private lastFailureAt?: string;
  private lastFailureError?: string;

  constructor(workerName: string) {
    this.workerName = workerName;
  }

  recordSuccess(eventId: string, eventType: string): void {
    this.processedCount++;
    this.lastProcessedEventId = eventId;
    this.lastProcessedEventType = eventType;
    this.lastProcessedAt = new Date().toISOString();
  }

  recordFailure(eventId: string, eventType: string, error: Error | string): void {
    this.failedCount++;
    this.lastProcessedEventId = eventId;
    this.lastProcessedEventType = eventType;
    this.lastFailureAt = new Date().toISOString();
    this.lastFailureError = typeof error === 'string' ? error : error.message;
  }

  getHealth(): WorkerHealthSnapshot {
    const total = this.processedCount + this.failedCount;
    const errorRate = total > 0 ? Math.round((this.failedCount / total) * 10000) / 100 : 0;
    const status = errorRate > 20 ? 'UNHEALTHY' : errorRate > 5 ? 'DEGRADED' : 'HEALTHY';

    return {
      workerName: this.workerName,
      status,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastProcessedEventId: this.lastProcessedEventId,
      lastProcessedEventType: this.lastProcessedEventType,
      lastProcessedAt: this.lastProcessedAt,
      lastFailureAt: this.lastFailureAt,
      lastFailureError: this.lastFailureError,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      errorRate,
    };
  }
}
