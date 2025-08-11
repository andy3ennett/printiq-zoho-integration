// src/workers/zohoWorker.js
import pkg from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../middleware/logging.js';
import {
  upsertZohoAccountByExternalId,
  NonRetryableError,
} from '../zoho/client.js';
import { mapPrintIQCustomerToZohoAccount } from '../mappings/customer.js';

const { Worker } = pkg;

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

async function processor(job) {
  const { name, data, id: jobId, attemptsMade } = job;
  const { printiqCustomerId, forceFail } = data || {};

  logger.info(
    { jobId, name, attemptsMade, printiqCustomerId },
    'worker received job'
  );

  // Deterministic failure path for exercising DLQ in non-prod
  if (forceFail && env.NODE_ENV !== 'production') {
    throw new Error('Forced failure for test (non-prod)');
  }

  try {
    // Fetch/construct mapped payload for Zoho
    const account = await mapPrintIQCustomerToZohoAccount(printiqCustomerId);
    const res = await upsertZohoAccountByExternalId(printiqCustomerId, account);

    logger.info(
      { jobId, printiqCustomerId, zohoId: res?.id },
      'customer upserted'
    );
    return { ok: true, zohoId: res?.id };
  } catch (err) {
    // If the client marked this as non-retryable, mark as failed permanently
    if (err instanceof NonRetryableError) {
      logger.warn(
        { jobId, printiqCustomerId, reason: err.message },
        'non-retryable job; discarding'
      );
      // letting it throw will mark failed; BullMQ will not retry when attempts exhausted; for hard stop:
      // return without throwing to mark completed-but-unsuccessful; we prefer fail:
      throw err;
    }

    logger.error(
      { jobId, printiqCustomerId, err: err?.message },
      'retryable error in worker'
    );
    // Throw to let BullMQ retry according to attempts/backoff
    throw err;
  }
}

export const zohoWorker = new Worker('zoho', processor, {
  connection,
  concurrency: Number(env.WORKER_CONCURRENCY || 5),
});

zohoWorker.on('ready', () => logger.info('zohoWorker ready'));
zohoWorker.on('failed', (job, err) =>
  logger.error({ jobId: job?.id, err: err?.message }, 'job failed')
);
zohoWorker.on('completed', job =>
  logger.info({ jobId: job?.id }, 'job completed')
);
