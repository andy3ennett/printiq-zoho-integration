import pkg from 'bullmq';
const { Queue } = pkg;
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
export const queue = new Queue('zoho', { connection });

export async function enqueueCustomerUpsert(data) {
  const isForceFailDev =
    !!data?.forceFail && process.env.NODE_ENV !== 'production';
  const attempts = isForceFailDev ? 1 : 5;
  const backoff = isForceFailDev
    ? undefined
    : { type: 'exponential', delay: 500 };

  if (isForceFailDev) {
    logger.warn(
      { id: data?.id },
      'Enqueueing with fast-fail (attempts=1) for DLQ test'
    );
  }

  return queue.add('customer.upsert', data, {
    attempts,
    backoff,
    removeOnComplete: 100,
    removeOnFail: false,
  });
}
