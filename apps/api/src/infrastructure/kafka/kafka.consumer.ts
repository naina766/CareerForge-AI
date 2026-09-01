import { Consumer, EachMessagePayload } from 'kafkajs';
import { prisma } from '@careerforge/database';
import { DomainEvent, KafkaTopics } from '@careerforge/types';
import { getKafkaClient } from './kafka.client.js';
import { KafkaProducerService } from './kafka.producer.js';
import { logger } from '../../utils/logger.js';
import { WorkerExecutionService } from '../observability/worker-execution.service.js';
import { MetricsService } from '../observability/metrics.js';

export type EventHandler = (event: DomainEvent) => Promise<void>;

export interface ConsumerConfig {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
}

export class KafkaConsumerService {
  private consumer: Consumer | null = null;
  private isRunning = false;
  private handlers = new Map<string, EventHandler>();
  private readonly groupId: string;
  private readonly topics: string[];
  private readonly fromBeginning: boolean;

  constructor(config: ConsumerConfig) {
    this.groupId = config.groupId;
    this.topics = config.topics;
    this.fromBeginning = config.fromBeginning ?? false;
  }

  /**
   * Registers a callback handler for a specific Domain Event type.
   */
  registerHandler(eventType: string, handler: EventHandler): this {
    this.handlers.set(eventType, handler);
    return this;
  }

  /**
   * Connects consumer and begins listening for topic messages.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      const kafka = getKafkaClient();
      this.consumer = kafka.consumer({
        groupId: this.groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });

      await this.consumer.connect();
      for (const topic of this.topics) {
        await this.consumer.subscribe({ topic, fromBeginning: this.fromBeginning });
      }

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.isRunning = true;
      logger.info(`[KafkaConsumer:${this.groupId}] Subscribed to [${this.topics.join(', ')}]`);
    } catch (err: any) {
      logger.warn(
        `[KafkaConsumer:${this.groupId}] Broker connection failed: ${err.message}. Running in local dispatcher mode.`
      );
    }
  }

  /**
   * Processes a single received message with idempotency guards and DLQ routing.
   */
  async handleMessage(payload: EachMessagePayload): Promise<void> {
    const rawValue = payload.message.value?.toString();
    if (!rawValue) return;

    let event: DomainEvent;
    try {
      event = JSON.parse(rawValue);
    } catch (err: any) {
      logger.error(`[KafkaConsumer:${this.groupId}] Malformed JSON event in partition ${payload.partition}`);
      await this.sendToDLQ(
        {
          eventId: `malformed-${Date.now()}`,
          eventType: 'unknown' as any,
          version: '1.0',
          occurredAt: new Date().toISOString(),
          producer: 'unknown',
          correlationId: 'unknown',
          aggregateType: 'unknown',
          aggregateId: 'unknown',
          payload: { raw: rawValue },
        },
        new Error(`JSON Parse Error: ${err.message}`)
      );
      return;
    }

    await this.processEventDirectly(event);
  }

  /**
   * Directly processes a Domain Event (used by both Kafka consumer and in-memory test dispatchers).
   */
  async processEventDirectly(event: DomainEvent): Promise<boolean> {
    const { eventId, eventType, correlationId } = event;
    const startTime = Date.now();

    // 1. Idempotency Check: Skip duplicate events
    const alreadyProcessed = await this.isEventProcessed(eventId);
    if (alreadyProcessed) {
      logger.info(`[KafkaConsumer:${this.groupId}] Duplicate event ${eventId} (${eventType}) ignored.`);
      return true;
    }

    const handler = this.handlers.get(eventType);
    if (!handler) {
      // No handler registered for this specific sub-event
      return true;
    }

    // 2. Execute Handler with Retry & DLQ
    let attempts = 0;
    const maxRetries = 3;
    let lastError: any = null;
    const executionId = await WorkerExecutionService.recordStart(this.groupId, eventId, eventType, 1);

    while (attempts < maxRetries) {
      attempts++;
      try {
        await handler(event);

        // 3. Mark Processed in PostgreSQL
        await this.markEventProcessed(eventId, eventType);
        const durationMs = Date.now() - startTime;
        await WorkerExecutionService.recordSuccess(executionId, durationMs);
        MetricsService.recordKafkaProcessed();

        logger.info(
          `[KafkaConsumer:${this.groupId}] Processed ${eventType} (EventId=${eventId}, CorrelationId=${correlationId}, Duration=${durationMs}ms)`
        );
        return true;
      } catch (err: any) {
        lastError = err;
        logger.warn(
          `[KafkaConsumer:${this.groupId}] Attempt ${attempts}/${maxRetries} failed for ${eventType} (${eventId}): ${err.message}`
        );
        if (attempts < maxRetries) {
          await WorkerExecutionService.recordFailure(executionId, err, 'RETRYING', Date.now() - startTime);
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts) * 100));
        }
      }
    }

    // 4. Exceeded Retries -> Route to Dead Letter Queue
    const totalDuration = Date.now() - startTime;
    await WorkerExecutionService.recordFailure(executionId, lastError, 'DLQ', totalDuration);
    MetricsService.recordKafkaDlq();
    logger.error(`[KafkaConsumer:${this.groupId}] Permanent failure for ${eventType} (${eventId}). Routing to DLQ.`);
    await this.sendToDLQ(event, lastError, attempts);
    return false;
  }

  /**
   * Checks whether event was already successfully processed by this consumer group.
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const record = await prisma.processedEvent.findUnique({
        where: {
          eventId_consumerGroup: {
            eventId,
            consumerGroup: this.groupId,
          },
        },
      });
      return Boolean(record);
    } catch {
      return false;
    }
  }

  /**
   * Persists idempotency tracking record in PostgreSQL.
   */
  private async markEventProcessed(eventId: string, eventType: string): Promise<void> {
    try {
      await prisma.processedEvent.upsert({
        where: {
          eventId_consumerGroup: {
            eventId,
            consumerGroup: this.groupId,
          },
        },
        create: {
          eventId,
          eventType,
          consumerGroup: this.groupId,
          status: 'COMPLETED',
        },
        update: {
          processedAt: new Date(),
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to write ProcessedEvent record: ${err.message}`);
    }
  }

  /**
   * Routes failed message to PostgreSQL DeadLetterEvent table and careerforge.dlq Kafka topic.
   */
  private async sendToDLQ(event: DomainEvent, error: Error, attempts = 1): Promise<void> {
    try {
      await prisma.deadLetterEvent.upsert({
        where: { eventId: event.eventId },
        create: {
          eventId: event.eventId,
          eventType: event.eventType,
          topic: this.topics[0] || 'unknown',
          consumerGroup: this.groupId,
          payload: event.payload as any,
          error: error.message || 'Unknown Error',
          stackTrace: error.stack,
          attempts,
        },
        update: {
          attempts,
          error: error.message,
          failedAt: new Date(),
        },
      });

      await KafkaProducerService.publish(KafkaTopics.DLQ, {
        ...event,
        eventType: `${event.eventType}.failed` as any,
        payload: {
          originalPayload: event.payload,
          error: error.message,
          consumerGroup: this.groupId,
          failedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      logger.error(`Failed to route to DLQ: ${err.message}`);
    }
  }

  async stop(): Promise<void> {
    if (this.consumer && this.isRunning) {
      try {
        await this.consumer.disconnect();
        logger.info(`[KafkaConsumer:${this.groupId}] Disconnected`);
      } catch (err: any) {
        logger.warn(`Error stopping consumer: ${err.message}`);
      } finally {
        this.isRunning = false;
        this.consumer = null;
      }
    }
  }
}
