import pkg from 'bullmq';
const { Worker } = pkg;
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // <-- required by BullMQ
  enableReadyCheck: true, // good default
});

export const worker = new Worker(
  'zoho',
  async job => {
    logger.info({ jobId: job.id, name: job.name }, 'processing job (stub)');
    // TODO: call real upsert here later
    return { ok: true };
  },
  { connection, concurrency: 5 }
);

worker.on('ready', () => logger.info('zohoWorker ready'));
worker.on('error', err => logger.error({ err }, 'zohoWorker error'));
