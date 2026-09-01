import { KafkaTopics } from '@careerforge/types';
import { KafkaConsumerService } from '../../../apps/api/src/infrastructure/kafka/kafka.consumer.js';
import { handleApplicationCreated, handleApplicationStatusChanged } from './handlers/application.handler.js';
import { handleNotificationRequested } from './handlers/notification.handler.js';

export function createNotificationWorkerConsumer(): KafkaConsumerService {
  const consumer = new KafkaConsumerService({
    groupId: 'careerforge-notification-worker',
    topics: [KafkaTopics.APPLICATION, KafkaTopics.NOTIFICATION],
  });

  consumer
    .registerHandler('application.created', handleApplicationCreated)
    .registerHandler('application.status.changed', handleApplicationStatusChanged)
    .registerHandler('notification.requested', handleNotificationRequested);

  return consumer;
}
