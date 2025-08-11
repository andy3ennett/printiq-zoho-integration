import { Worker, Queue } from 'bullmq';
import { connection, ZOHO_QUEUE_NAME } from '../queues/zohoQueue.js';
import { getValidAccessToken } from '../../sync/auth/tokenManager.js';
import {
  searchAccountsByExternalId,
  createAccount,
  updateAccount,
  NonRetryableError,
} from '../zoho/client.js';
import { toZohoAccount } from '../mappings/customer.js';
import { logger, redactPII } from '../utils/logger.js';

export function backoffStrategy(attemptsMade) {
  const base = 1000 * Math.pow(2, attemptsMade);
  const jitter = Math.floor(Math.random() * 1000);
  return base + jitter;
}

export async function processor(job) {
  const start = Date.now();
  const { requestId, printiqCustomerId, name, forceFail } = job.data;
  const extId = String(printiqCustomerId);

  try {
    if (forceFail && process.env.NODE_ENV !== 'production') {
      throw new NonRetryableError('Forced failure');
    }

    const token = await getValidAccessToken();
    const body = toZohoAccount({ printiqCustomerId: extId, name });

    const found = await searchAccountsByExternalId(token, extId);
    let path = 'create';
    let zohoId;
    if (found) {
      path = 'update';
      zohoId = found.id;
      await updateAccount(token, zohoId, body);
    } else {
      const created = await createAccount(token, body);
      zohoId = created?.details?.id || created?.id;
    }

    const duration = Date.now() - start;
    logger.info(
      { requestId, jobId: job.id, extId, path, zohoId, duration },
      'job customer.upsert success'
    );
    return { zohoId, path };
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(
      { requestId, jobId: job.id, extId, err: err?.message, duration },
      'job customer.upsert error'
    );
    if (err instanceof NonRetryableError) {
      job.discard();
    }
    throw err;
  }
}

export const worker = new Worker(ZOHO_QUEUE_NAME, processor, {
  connection,
  concurrency: 5,
  settings: {
    backoffStrategy,
  },
});

worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= (job.opts.attempts || 1)) {
    const deadQueue = new Queue(`${job.queueName}:dead`, { connection });
    const preview = redactPII(JSON.stringify(job.data).slice(0, 200));
    logger.error(
      { jobId: job.id, err: err?.message, payload: preview },
      'job moved to DLQ'
    );
    await deadQueue.add(job.name, job.data);
  }
});
