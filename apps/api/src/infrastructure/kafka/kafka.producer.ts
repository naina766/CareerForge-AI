import { Producer } from 'kafkajs';
import { DomainEvent, KafkaTopic } from '@careerforge/types';
import { getKafkaClient } from './kafka.client.js';
import { logger } from '../../utils/logger.js';

export class KafkaProducerService {
  private static producer: Producer | null = null;
  private static isConnected = false;
  private static inMemoryBuffer: Array<{ topic: string; event: DomainEvent }> = [];

  static async connect(): Promise<void> {
    if (this.isConnected && this.producer) return;

    try {
      const kafka = getKafkaClient();
      this.producer = kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      });

      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka Producer successfully connected');
    } catch (err: any) {
      logger.warn(`Kafka broker connection failed: ${err.message}. Producer entering offline buffered mode.`);
      this.isConnected = false;
    }
  }

  /**
   * Publishes a single Domain Event to a Kafka topic.
   */
  static async publish<T = any>(topic: KafkaTopic | string, event: DomainEvent<T>): Promise<boolean> {
    const startTime = Date.now();

    try {
      if (!this.isConnected || !this.producer) {
        await this.connect();
      }

      if (this.isConnected && this.producer) {
        const sendPromise = this.producer.send({
          topic,
          messages: [
            {
              key: event.aggregateId,
              value: JSON.stringify(event),
              headers: {
                eventId: event.eventId,
                eventType: event.eventType,
                correlationId: event.correlationId,
                causationId: event.causationId || '',
                producer: event.producer,
                version: event.version,
              },
            },
          ],
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Send operation timed out')), 1500)
        );

        await Promise.race([sendPromise, timeoutPromise]);

        const durationMs = Date.now() - startTime;
        logger.info(
          `[KafkaProducer] Published ${event.eventType} to ${topic} (Key=${event.aggregateId}, Latency=${durationMs}ms)`
        );
        return true;
      }
    } catch (err: any) {
      logger.error(`[KafkaProducer] Failed to send to ${topic}: ${err.message}. Buffering in memory.`);
    }

    // Offline / Test Fallback Buffer
    this.inMemoryBuffer.push({ topic, event: event as any });
    return true;
  }

  /**
   * Publishes a batch of Domain Events to a Kafka topic.
   */
  static async publishBatch(topic: KafkaTopic | string, events: DomainEvent[]): Promise<boolean> {
    if (events.length === 0) return true;

    try {
      if (!this.isConnected || !this.producer) {
        await this.connect();
      }

      if (this.isConnected && this.producer) {
        await this.producer.send({
          topic,
          messages: events.map((event) => ({
            key: event.aggregateId,
            value: JSON.stringify(event),
            headers: {
              eventId: event.eventId,
              eventType: event.eventType,
              correlationId: event.correlationId,
              causationId: event.causationId || '',
              producer: event.producer,
            },
          })),
        });

        logger.info(`[KafkaProducer] Batch published ${events.length} events to ${topic}`);
        return true;
      }
    } catch (err: any) {
      logger.error(`[KafkaProducer] Batch send failed to ${topic}: ${err.message}`);
    }

    for (const ev of events) {
      this.inMemoryBuffer.push({ topic, event: ev });
    }
    return true;
  }

  static getBufferedEvents(): Array<{ topic: string; event: DomainEvent }> {
    return [...this.inMemoryBuffer];
  }

  static clearBufferedEvents(): void {
    this.inMemoryBuffer = [];
  }

  static async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        logger.info('Kafka Producer disconnected');
      } catch (err: any) {
        logger.warn(`Error disconnecting Kafka producer: ${err.message}`);
      } finally {
        this.isConnected = false;
        this.producer = null;
      }
    }
  }
}
