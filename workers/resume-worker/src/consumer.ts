import { KafkaTopics } from '@careerforge/types';
import { KafkaConsumerService } from '../../../apps/api/src/infrastructure/kafka/kafka.consumer.js';
import { handleResumeUploaded } from './handlers/resume-uploaded.handler.js';

export function createResumeWorkerConsumer(): KafkaConsumerService {
  const consumer = new KafkaConsumerService({
    groupId: 'careerforge-resume-worker',
    topics: [KafkaTopics.RESUME],
  });

  consumer.registerHandler('resume.uploaded', handleResumeUploaded);
  return consumer;
}
