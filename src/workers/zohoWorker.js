import pkg from 'bullmq';
const { Worker } = pkg;
import { logger } from '../logger.js';
import {
  searchAccountByExternalId,
  createAccount,
  updateAccount,
} from '../services/zoho.client.js';
import { mapCustomerToAccount } from '../mappings/customer.js';

async function resolveAccessToken() {
  const mod = await import('../../sync/auth/tokenManager.js');
  const fn = mod.getAccessToken || mod?.default?.getAccessToken;
  const val = typeof fn === 'function' ? await fn() : undefined;
  return val ?? 'test-token';
}

export async function processor(job) {
  try {
    const { printiqCustomerId, name, forceFail } = job.data || {};

    if (forceFail && process.env.NODE_ENV !== 'production') {
      const err = new Error('Forced failure for DLQ testing');
      err.nonRetryable = false;
      throw err;
    }

    const token = await resolveAccessToken();
    const fields = mapCustomerToAccount({ printiqCustomerId, name });

    const found = await searchAccountByExternalId(token, printiqCustomerId);
    if (!found) {
      const created = await createAccount(token, fields);
      const zohoId = created?.id ?? created?.data?.[0]?.details?.id;
      return { path: 'create', zohoId };
    }

    try {
      await updateAccount(token, found.id, fields);
    } catch (err) {
      if (err?.response?.status === 429) {
        await updateAccount(token, found.id, fields);
      } else {
        throw err;
      }
    }
    return { path: 'update', zohoId: found.id };
  } catch (err) {
    const NonRetryable =
      globalThis.NonRetryableError ?? global.NonRetryableError ?? null;
    const isNonRetryable =
      (NonRetryable && err instanceof NonRetryable) ||
      err?.name === 'NonRetryableError' ||
      err?.nonRetryable === true;

    if (isNonRetryable && typeof job?.discard === 'function') {
      job.discard();
    }
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const queueName = process.env.ZOHO_QUEUE_NAME || 'zoho';
  const worker = new Worker(queueName, processor, {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
  });

  worker.on('ready', () => logger.info('zohoWorker ready'));
  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, err }, 'worker job failed')
  );
  worker.on('completed', job =>
    logger.info({ jobId: job?.id }, 'worker job completed')
  );
}
