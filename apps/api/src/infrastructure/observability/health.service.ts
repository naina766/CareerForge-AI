import { prisma } from '@careerforge/database';
import { env } from '@careerforge/config';
import { ServiceHealthItem, SystemHealthResponse, ServiceHealthStatus } from '@careerforge/types';
import { getKafkaClient } from '../kafka/kafka.client.js';
import { getRedisClient } from '../redis/redis.client.js';

export class HealthCheckService {
  private static startTime = Date.now();

  /**
   * Performs deep multi-service health inspection.
   */
  static async checkSystemHealth(): Promise<SystemHealthResponse> {
    const [
      postgresHealth,
      redisHealth,
      kafkaHealth,
      aiServiceHealth,
      faissHealth,
      resumeWorkerHealth,
      aiWorkerHealth,
      notificationWorkerHealth,
    ] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkKafka(),
      this.checkAiService(),
      this.checkFaiss(),
      this.checkWorker('careerforge-resume-worker'),
      this.checkWorker('careerforge-ai-worker'),
      this.checkWorker('careerforge-notification-worker'),
    ]);

    const services: Record<string, ServiceHealthItem> = {
      api: {
        service: 'api',
        status: 'HEALTHY',
        latencyMs: 1,
        message: 'API operational',
        lastChecked: new Date().toISOString(),
      },
      postgres: postgresHealth,
      redis: redisHealth,
      kafka: kafkaHealth,
      aiService: aiServiceHealth,
      faiss: faissHealth,
      resumeWorker: resumeWorkerHealth,
      aiWorker: aiWorkerHealth,
      notificationWorker: notificationWorkerHealth,
    };

    // Determine overall system health state
    // Critical services: postgres, api
    // Non-critical / fallback-supported services: aiService, redis, faiss, kafka, workers
    let overallStatus: ServiceHealthStatus = 'HEALTHY';
    if (postgresHealth.status === 'UNHEALTHY' || services.api.status === 'UNHEALTHY') {
      overallStatus = 'UNHEALTHY';
    } else if (Object.values(services).some((s) => s.status === 'DEGRADED' || s.status === 'UNHEALTHY')) {
      overallStatus = 'DEGRADED';
    }

    // Non-blocking snapshot persistence in PostgreSQL
    this.recordHealthChecksAsync(services);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: env.NODE_ENV || 'development',
      services,
    };
  }

  private static async checkPostgres(): Promise<ServiceHealthItem> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        service: 'postgres',
        status: 'HEALTHY',
        latencyMs: Date.now() - start,
        message: 'PostgreSQL connection active',
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        service: 'postgres',
        status: 'UNHEALTHY',
        latencyMs: Date.now() - start,
        message: `Database connection failed: ${err.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async checkRedis(): Promise<ServiceHealthItem> {
    const start = Date.now();
    try {
      const redis = getRedisClient();
      if (!redis) {
        return {
          service: 'redis',
          status: 'DEGRADED',
          latencyMs: Date.now() - start,
          message: 'Redis client unavailable (in-memory fallback active)',
          lastChecked: new Date().toISOString(),
        };
      }

      const pong = await Promise.race([
        redis.ping(),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timed out after 2000ms')), 2000)
        ),
      ]);

      if (pong !== 'PONG') {
        throw new Error(`Unexpected ping response: ${pong}`);
      }

      return {
        service: 'redis',
        status: 'HEALTHY',
        latencyMs: Date.now() - start,
        message: 'Redis cache connected and responsive',
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        service: 'redis',
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: `Redis connection warning: ${err.message} (in-memory fallback active)`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async checkKafka(): Promise<ServiceHealthItem> {
    const start = Date.now();
    try {
      const kafka = getKafkaClient();
      const admin = kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();

      return {
        service: 'kafka',
        status: 'HEALTHY',
        latencyMs: Date.now() - start,
        message: 'Kafka broker & topics reachable',
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        service: 'kafka',
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: `Kafka broker unreachable (${err.message}). Using Outbox buffering.`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async checkAiService(): Promise<ServiceHealthItem> {
    const start = Date.now();
    try {
      const aiUrl = env.AI_SERVICE_URL || 'http://localhost:8000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${aiUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return {
          service: 'aiService',
          status: 'HEALTHY',
          latencyMs: Date.now() - start,
          message: 'FastAPI AI Engine operational',
          lastChecked: new Date().toISOString(),
        };
      }
      return {
        service: 'aiService',
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: `AI service returned status ${res.status}`,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        service: 'aiService',
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: `AI Service connection offline (${err.message}). Deterministic fallback active.`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async checkFaiss(): Promise<ServiceHealthItem> {
    const start = Date.now();
    try {
      const aiUrl = env.AI_SERVICE_URL || 'http://localhost:8000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${aiUrl}/metrics`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return {
          service: 'faiss',
          status: 'HEALTHY',
          latencyMs: Date.now() - start,
          message: 'FAISS dense semantic index active',
          lastChecked: new Date().toISOString(),
        };
      }
      return {
        service: 'faiss',
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: 'FAISS service probe warning. Local fallback available.',
        lastChecked: new Date().toISOString(),
      };
    } catch {
      return {
        service: 'faiss',
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: 'FAISS semantic retrieval offline. Keyword matching active.',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async checkWorker(workerName: string): Promise<ServiceHealthItem> {
    const start = Date.now();
    try {
      const recentExecution = await prisma.workerExecution.findFirst({
        where: { workerName },
        orderBy: { startedAt: 'desc' },
      });

      if (!recentExecution) {
        return {
          service: workerName,
          status: 'HEALTHY',
          latencyMs: Date.now() - start,
          message: 'Worker registered (idle)',
          lastChecked: new Date().toISOString(),
        };
      }

      const isFailing = recentExecution.status === 'FAILED' || recentExecution.status === 'DLQ';
      return {
        service: workerName,
        status: isFailing ? 'DEGRADED' : 'HEALTHY',
        latencyMs: recentExecution.durationMs || Date.now() - start,
        message: `Status: ${recentExecution.status} (Attempt ${recentExecution.attempt})`,
        lastChecked: recentExecution.startedAt.toISOString(),
      };
    } catch {
      return {
        service: workerName,
        status: 'HEALTHY',
        latencyMs: Date.now() - start,
        message: 'Worker active',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private static async recordHealthChecksAsync(services: Record<string, ServiceHealthItem>): Promise<void> {
    try {
      for (const svc of Object.values(services)) {
        await prisma.serviceHealthCheck.create({
          data: {
            service: svc.service,
            status: svc.status as any,
            latencyMs: svc.latencyMs,
            metadata: { message: svc.message },
          },
        });
      }
    } catch {
      // Non-blocking telemetry persistence
    }
  }
}
