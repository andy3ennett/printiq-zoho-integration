import pkg from 'bullmq';
const { Queue } = pkg;
import { logger } from '../logger.js';

const queueName = process.env.ZOHO_QUEUE_NAME || 'zoho';

export const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 500 },
  removeOnComplete: 100,
  removeOnFail: false,
};

export const zohoQueue = new Queue(queueName, {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
  defaultJobOptions, // keep for runtime
});

export async function enqueueCustomerUpsert(
  { requestId, printiqCustomerId, name },
  overrides = {}
) {
  const jobName = 'customer.upsert';
  const payload = { requestId, printiqCustomerId, name };

  // Pass explicit options so tests can assert them from add() call
  const opts = { ...defaultJobOptions, ...overrides };

  const job = await zohoQueue.add(jobName, payload, opts);
  logger.info(
    { jobId: job.id, printiqCustomerId, overrides },
    'queued customer.upsert'
  );
  return job;
}
