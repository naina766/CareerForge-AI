import { Prisma } from '@prisma/client';
import { prisma } from '@careerforge/database';
import { DomainEvent, KafkaTopic } from '@careerforge/types';

export class OutboxService {
  /**
   * Schedules a domain event inside a Prisma transaction for reliable delivery.
   */
  static async scheduleEvent<T = any>(
    event: DomainEvent<T>,
    topic: KafkaTopic | string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx || prisma;

    await db.outboxEvent.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        topic,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as any,
        headers: {
          correlationId: event.correlationId,
          causationId: event.causationId,
          producer: event.producer,
          version: event.version,
          occurredAt: event.occurredAt,
        },
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 5,
        availableAt: new Date(),
      },
    });
  }
}
