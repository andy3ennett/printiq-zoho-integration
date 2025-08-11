import crypto from 'crypto';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

export const redis =
  process.env.NODE_ENV === 'test'
    ? { set: async () => 'OK', ping: async () => 'PONG' }
    : new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });

export async function setIfNotExists(key, ttlSecs, client = redis) {
  const res = await client.set(key, '1', 'EX', ttlSecs, 'NX');
  return res === 'OK';
}

export function buildKey(eventType, eventId) {
  return `printiq:${eventType}:${eventId}`;
}

export function hashPayload(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}
