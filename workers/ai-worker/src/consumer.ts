import { KafkaTopics } from '@careerforge/types';
import { KafkaConsumerService } from '../../../apps/api/src/infrastructure/kafka/kafka.consumer.js';
import { handleResumeProcessed } from './handlers/resume-processed.handler.js';
import { handleMatchRequested } from './handlers/match-requested.handler.js';
import { handleSkillGapRequested } from './handlers/skill-gap.handler.js';
import { handleRecommendationRefreshRequested } from './handlers/recommendation.handler.js';

export function createAIWorkerConsumer(): KafkaConsumerService {
  const consumer = new KafkaConsumerService({
    groupId: 'careerforge-ai-worker',
    topics: [KafkaTopics.RESUME, KafkaTopics.MATCHING, KafkaTopics.SKILL_GAP, KafkaTopics.RECOMMENDATION],
  });

  consumer
    .registerHandler('resume.processed', handleResumeProcessed)
    .registerHandler('match.requested', handleMatchRequested)
    .registerHandler('skill-gap.analysis.requested', handleSkillGapRequested)
    .registerHandler('recommendation.refresh.requested', handleRecommendationRefreshRequested);

  return consumer;
}
