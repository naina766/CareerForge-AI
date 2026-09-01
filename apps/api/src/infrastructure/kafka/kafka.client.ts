import { Kafka, logLevel } from 'kafkajs';
import { logger } from '../../utils/logger.js';

let kafkaInstance: Kafka | null = null;

export function getKafkaClient(): Kafka {
  if (!kafkaInstance) {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'careerforge-api';

    kafkaInstance = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.NOTHING,
      connectionTimeout: 1000,
      requestTimeout: 1500,
      retry: {
        initialRetryTime: 100,
        retries: 1,
      },
    });

    logger.info(`Kafka client initialized with brokers: ${brokers.join(', ')}`);
  }

  return kafkaInstance;
}
