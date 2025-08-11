import IORedis from 'ioredis';
import { env } from '../config/env.js';

const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // not strictly required for simple SET, but keeps behavior consistent
  enableReadyCheck: true,
});

export async function setOnce(key, ttlSeconds = 1800) {
  const res = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
  return res === 'OK'; // true if set, false if existed
}
