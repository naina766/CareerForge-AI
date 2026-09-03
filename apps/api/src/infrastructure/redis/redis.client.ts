import { Redis } from 'ioredis';
import { logger } from '../../utils/logger.js';

let redisInstance: Redis | null = null;
let isConnected = false;

export function getRedisClient(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisInstance = new Redis(redisUrl, {
      family: 4,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 3000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 5) {
          logger.warn(`[Redis] Reconnect retry limit reached (${times} attempts). Stopping active retries.`);
          return null;
        }
        return Math.min(times * 500, 3000);
      },
      lazyConnect: false,
    });

    redisInstance.on('connect', () => {
      isConnected = true;
      logger.info(`[Redis] Connected to ${redisUrl}`);
    });

    redisInstance.on('ready', () => {
      isConnected = true;
    });

    redisInstance.on('error', (err) => {
      isConnected = false;
      logger.warn(`[Redis] Connection error: ${err.message}. Falling back to in-memory mode.`);
    });

    redisInstance.on('close', () => {
      isConnected = false;
    });

    redisInstance.on('end', () => {
      isConnected = false;
    });

    return redisInstance;
  } catch (err: any) {
    logger.warn(`[Redis] Failed to initialize Redis client: ${err.message}. Running in fallback mode.`);
    redisInstance = null;
    isConnected = false;
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return isConnected && redisInstance !== null && redisInstance.status === 'ready';
}

export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    } finally {
      redisInstance = null;
      isConnected = false;
    }
  }
}
