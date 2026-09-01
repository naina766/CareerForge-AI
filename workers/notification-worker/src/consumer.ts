import { KafkaTopics } from '@careerforge/types';
import { KafkaConsumerService } from '../../../apps/api/src/infrastructure/kafka/kafka.consumer.js';
import { handleApplicationCreated, handleApplicationStatusChanged } from './handlers/application.handler.js';
import {
  handleNotificationRequested,
  handleMatchCompleted,
  handleSkillGapAnalyzed,
  handleRecommendationRefreshed,
  handleResumeProcessed,
} from './handlers/notification.handler.js';

export function createNotificationWorkerConsumer(): KafkaConsumerService {
  const consumer = new KafkaConsumerService({
    groupId: 'careerforge-notification-worker',
    topics: [
      KafkaTopics.APPLICATION,
      KafkaTopics.NOTIFICATION,
      KafkaTopics.MATCHING,
      KafkaTopics.SKILL_GAP,
      KafkaTopics.RECOMMENDATION,
      KafkaTopics.RESUME,
    ],
  });

  consumer
    .registerHandler('application.created', handleApplicationCreated)
    .registerHandler('application.status.changed', handleApplicationStatusChanged)
    .registerHandler('notification.requested', handleNotificationRequested)
    .registerHandler('match.completed', handleMatchCompleted)
    .registerHandler('skill-gap.analyzed', handleSkillGapAnalyzed)
    .registerHandler('recommendation.refresh.completed', handleRecommendationRefreshed)
    .registerHandler('resume.processed', handleResumeProcessed);

  return consumer;
}
