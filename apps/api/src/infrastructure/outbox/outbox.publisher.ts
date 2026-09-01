import { prisma } from '@careerforge/database';
import { DomainEvent } from '@careerforge/types';
import { KafkaProducerService } from '../kafka/kafka.producer.js';
import { logger } from '../../utils/logger.js';

export class OutboxPublisher {
  private static isProcessing = false;

  /**
   * Sweeps and publishes pending outbox events to their respective Kafka topics.
   */
  static async publishPendingEvents(batchSize = 25): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const now = new Date();

      const pendingEvents = await prisma.outboxEvent.findMany({
        where: {
          status: 'PENDING',
          availableAt: { lte: now },
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });

      if (pendingEvents.length === 0) {
        return 0;
      }

      let publishedCount = 0;

      for (const record of pendingEvents) {
        const headers = (record.headers as any) || {};
        const domainEvent: DomainEvent = {
          eventId: record.eventId,
          eventType: record.eventType as any,
          version: headers.version || '1.0',
          occurredAt: headers.occurredAt || record.createdAt.toISOString(),
          producer: headers.producer || 'careerforge-api',
          correlationId: headers.correlationId || record.id,
          causationId: headers.causationId || null,
          aggregateType: record.aggregateType,
          aggregateId: record.aggregateId,
          payload: record.payload as any,
        };

        try {
          const success = await KafkaProducerService.publish(record.topic, domainEvent);

          if (success) {
            await prisma.outboxEvent.update({
              where: { id: record.id },
              data: {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                attempts: record.attempts + 1,
              },
            });
            publishedCount++;
          } else {
            throw new Error('Kafka publish returned false');
          }
        } catch (err: any) {
          const nextAttempts = record.attempts + 1;
          const isFailed = nextAttempts >= record.maxAttempts;

          // Exponential backoff for retry: 1s, 2s, 4s, 8s...
          const backoffSeconds = Math.pow(2, nextAttempts);
          const nextAvailableAt = new Date(Date.now() + backoffSeconds * 1000);

          await prisma.outboxEvent.update({
            where: { id: record.id },
            data: {
              status: isFailed ? 'FAILED' : 'PENDING',
              attempts: nextAttempts,
              lastError: err.message,
              availableAt: nextAvailableAt,
            },
          });

          logger.error(
            `[OutboxPublisher] Failed to publish event ${record.eventId} (Attempt ${nextAttempts}/${record.maxAttempts}): ${err.message}`
          );
        }
      }

      return publishedCount;
    } finally {
      this.isProcessing = false;
    }
  }
}
