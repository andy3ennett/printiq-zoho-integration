import Redis from 'ioredis';
import { logger } from '../logger.js';

const client = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

client.on('error', err => logger.error({ err }, 'redis error'));

export async function setOnce(key, ttlSeconds = 1800) {
  const res = await client.set(key, '1', 'EX', ttlSeconds, 'NX');
  return res === 'OK';
}

export async function setIfNotExists(key, ttlSeconds = 1800) {
  return setOnce(key, ttlSeconds);
}
