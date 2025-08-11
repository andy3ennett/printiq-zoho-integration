import pkg from 'bullmq';
const { Queue } = pkg;
import IORedis from 'ioredis';
import { env } from '../config/env.js';

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export const zohoQueue = new Queue('zoho', { connection });

export async function enqueueCustomerUpsert(payload, opts = {}) {
  return zohoQueue.add('customer.upsert', payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
    removeOnComplete: 100,
    removeOnFail: false,
    ...opts,
  });
}
