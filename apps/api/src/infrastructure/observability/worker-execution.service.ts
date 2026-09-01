import { prisma } from '@careerforge/database';
import { WorkerJobStatus, WorkerExecutionRecord } from '@careerforge/types';
import { logger } from '../../utils/logger.js';

export class WorkerExecutionService {
  /**
   * Records the start of a background worker execution.
   */
  static async recordStart(
    workerName: string,
    eventId: string,
    eventType: string,
    attempt = 1
  ): Promise<string> {
    try {
      const execution = await prisma.workerExecution.create({
        data: {
          workerName,
          eventId,
          eventType,
          status: 'STARTED',
          attempt,
          startedAt: new Date(),
        },
      });
      return execution.id;
    } catch (err: any) {
      logger.error(`[WorkerExecutionService] Failed to record start: ${err.message}`);
      return `exec-${Date.now()}`;
    }
  }

  /**
   * Updates an execution record upon successful completion.
   */
  static async recordSuccess(
    executionId: string,
    durationMs: number
  ): Promise<void> {
    try {
      await prisma.workerExecution.update({
        where: { id: executionId },
        data: {
          status: 'SUCCESS',
          durationMs,
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      logger.error(`[WorkerExecutionService] Failed to record success: ${err.message}`);
    }
  }

  /**
   * Updates an execution record upon failure or retry.
   */
  static async recordFailure(
    executionId: string,
    error: Error | string,
    status: WorkerJobStatus = 'FAILED',
    durationMs?: number
  ): Promise<void> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const stackTrace = typeof error === 'string' ? undefined : error.stack;

      await prisma.workerExecution.update({
        where: { id: executionId },
        data: {
          status,
          error: errorMessage,
          stackTrace,
          durationMs,
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      logger.error(`[WorkerExecutionService] Failed to record failure: ${err.message}`);
    }
  }

  /**
   * Retrieves paginated worker execution records.
   */
  static async getWorkerExecutions(options?: {
    workerName?: string;
    status?: WorkerJobStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: WorkerExecutionRecord[]; total: number }> {
    const where: any = {};
    if (options?.workerName) where.workerName = options.workerName;
    if (options?.status) where.status = options.status;

    const [total, items] = await Promise.all([
      prisma.workerExecution.count({ where }),
      prisma.workerExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
    ]);

    return {
      total,
      items: items.map((i) => ({
        id: i.id,
        workerName: i.workerName,
        eventId: i.eventId,
        eventType: i.eventType,
        status: i.status as WorkerJobStatus,
        durationMs: i.durationMs,
        attempt: i.attempt,
        error: i.error,
        stackTrace: i.stackTrace,
        startedAt: i.startedAt.toISOString(),
        completedAt: i.completedAt ? i.completedAt.toISOString() : null,
      })),
    };
  }

  /**
   * Computes worker performance and error stats.
   */
  static async getWorkerStats(): Promise<Array<{
    workerName: string;
    totalExecutions: number;
    successCount: number;
    failedCount: number;
    errorRate: number;
    avgDurationMs: number;
  }>> {
    const workers = ['careerforge-resume-worker', 'careerforge-ai-worker', 'careerforge-notification-worker'];
    const stats = await Promise.all(
      workers.map(async (workerName) => {
        const [total, success, failed, executions] = await Promise.all([
          prisma.workerExecution.count({ where: { workerName } }),
          prisma.workerExecution.count({ where: { workerName, status: 'SUCCESS' } }),
          prisma.workerExecution.count({ where: { workerName, status: { in: ['FAILED', 'DLQ'] } } }),
          prisma.workerExecution.findMany({
            where: { workerName, durationMs: { not: null } },
            select: { durationMs: true },
            take: 100,
          }),
        ]);

        const avgDuration =
          executions.length > 0
            ? Math.round((executions.reduce((acc, e) => acc + (e.durationMs || 0), 0) / executions.length) * 100) / 100
            : 0;

        const errorRate = total > 0 ? Math.round((failed / total) * 10000) / 100 : 0;

        return {
          workerName,
          totalExecutions: total,
          successCount: success,
          failedCount: failed,
          errorRate,
          avgDurationMs: avgDuration,
        };
      })
    );

    return stats;
  }
}
