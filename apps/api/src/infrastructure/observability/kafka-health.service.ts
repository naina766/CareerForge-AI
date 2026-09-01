import { KafkaTopics } from '@careerforge/types';
import { prisma } from '@careerforge/database';
import { getKafkaClient } from '../kafka/kafka.client.js';

export interface KafkaTopicMetadata {
  topic: string;
  partitions: number;
  messageCount?: number;
  dlqCount?: number;
}

export interface KafkaConsumerGroupStatus {
  groupId: string;
  state: string;
  protocol: string;
  membersCount: number;
}

export class KafkaHealthService {
  /**
   * Retrieves overall Kafka telemetry and cluster status.
   */
  static async getKafkaHealthReport(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    brokersCount: number;
    topics: KafkaTopicMetadata[];
    consumerGroups: KafkaConsumerGroupStatus[];
    outboxStats: {
      pending: number;
      published: number;
      failed: number;
    };
    dlqStats: {
      total: number;
      lastFailedAt?: string;
    };
  }> {
    const [outboxPending, outboxPublished, outboxFailed, dlqCount, lastDlq] = await Promise.all([
      prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
      prisma.outboxEvent.count({ where: { status: 'PUBLISHED' } }),
      prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
      prisma.deadLetterEvent.count(),
      prisma.deadLetterEvent.findFirst({ orderBy: { failedAt: 'desc' } }),
    ]);

    const registeredTopics = Object.values(KafkaTopics);
    const topicMetadataList: KafkaTopicMetadata[] = registeredTopics.map((topic) => ({
      topic,
      partitions: 3,
      messageCount: 0,
      dlqCount: topic === KafkaTopics.DLQ ? dlqCount : 0,
    }));

    const knownConsumerGroups: KafkaConsumerGroupStatus[] = [
      {
        groupId: 'careerforge-resume-worker',
        state: 'Stable',
        protocol: 'consumer',
        membersCount: 1,
      },
      {
        groupId: 'careerforge-ai-worker',
        state: 'Stable',
        protocol: 'consumer',
        membersCount: 1,
      },
      {
        groupId: 'careerforge-notification-worker',
        state: 'Stable',
        protocol: 'consumer',
        membersCount: 1,
      },
    ];

    try {
      const kafka = getKafkaClient();
      const admin = kafka.admin();
      await admin.connect();
      const topics = await admin.listTopics();
      const groups = await admin.listGroups();
      await admin.disconnect();

      return {
        status: 'HEALTHY',
        brokersCount: 1,
        topics: topics.map((t: string) => ({ topic: t, partitions: 3 })),
        consumerGroups: groups.groups.map((g: any) => ({
          groupId: g.groupId,
          state: g.protocolType || 'consumer',
          protocol: 'consumer',
          membersCount: 1,
        })),
        outboxStats: {
          pending: outboxPending,
          published: outboxPublished,
          failed: outboxFailed,
        },
        dlqStats: {
          total: dlqCount,
          lastFailedAt: lastDlq?.failedAt.toISOString(),
        },
      };
    } catch {
      // Fallback telemetry using PostgreSQL outbox and registered topics
      return {
        status: 'DEGRADED',
        brokersCount: 1,
        topics: topicMetadataList,
        consumerGroups: knownConsumerGroups,
        outboxStats: {
          pending: outboxPending,
          published: outboxPublished,
          failed: outboxFailed,
        },
        dlqStats: {
          total: dlqCount,
          lastFailedAt: lastDlq?.failedAt.toISOString(),
        },
      };
    }
  }
}
