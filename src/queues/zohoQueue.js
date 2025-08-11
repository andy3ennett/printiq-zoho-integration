import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

let connection;
if (process.env.NODE_ENV === 'test') {
  connection = { options: {} };
} else {
  connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  connection.options = connection.options || {};
}
export { connection };
export const ZOHO_QUEUE_NAME = 'zoho';

export const zohoQueue = new Queue(ZOHO_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'custom' },
    removeOnComplete: 100,
    removeOnFail: false,
  },
});

export function addZohoJob(name, data, opts = {}) {
  return zohoQueue.add(name, data, opts);
}
