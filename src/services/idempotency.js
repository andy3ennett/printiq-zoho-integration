// src/services/idempotency.js
import Redis from 'ioredis';
import { logger } from '../logger.js';

// single instance, single export
export const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

if (typeof redis?.on === 'function') {
  redis.on('error', err => logger.error({ err }, 'redis error'));
}

export async function setOnce(key, ttlSeconds = 1800) {
  const res = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
  return res === 'OK';
}

export async function setIfNotExists(key, ttlSeconds = 1800) {
  return setOnce(key, ttlSeconds);
}
