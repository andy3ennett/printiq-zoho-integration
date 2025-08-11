// src/queues/zohoQueue.js
import pkg from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../middleware/logging.js';

const { Queue } = pkg;

// Shared Redis connection options required by BullMQ
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

// Base queue with sensible defaults
export const zohoQueue = new Queue('zoho', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
    // keep some history for observability, but avoid unbounded growth
    removeOnComplete: 100,
    removeOnFail: false,
  },
});

const isProd = env.NODE_ENV === 'production';

/**
 * Enqueue a customer upsert job.
 * - Minimizes payload to what the worker needs.
 * - Supports fast-fail for dev/testing when `forceFail` is true.
 */
export async function enqueueCustomerUpsert({
  printiqCustomerId,
  forceFail = false,
}) {
  const jobName = 'customer.upsert';

  // Fast-fail in non-prod to exercise the DLQ paths deterministically
  const overrides =
    !isProd && forceFail ? { attempts: 1, backoff: undefined } : {};

  const payload = {
    printiqCustomerId,
    source: 'printiq',
    ...(forceFail ? { forceFail: true } : {}),
  };

  const job = await zohoQueue.add(jobName, payload, overrides);
  logger.info(
    { jobId: job.id, printiqCustomerId, overrides },
    'queued customer.upsert'
  );
  return job;
}
