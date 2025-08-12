import pkg from 'bullmq';
const { Worker } = pkg;
import { logger } from '../logger.js';
import { zohoClient } from '../services/zoho.client.js';
import { mapCustomerToAccount } from '../mappings/customer.js';
import { getAccessToken } from '../../sync/auth/tokenManager.js';

export async function processor(job) {
  const { printiqCustomerId, name, forceFail } = job.data || {};
  if (forceFail && process.env.NODE_ENV !== 'production') {
    const err = new Error('Forced failure for DLQ testing');
    err.nonRetryable = false;
    throw err;
  }
  const token = await getAccessToken();
  const fields = mapCustomerToAccount({ printiqCustomerId, name });

  const found = await zohoClient.searchAccountByExternalId(
    token,
    printiqCustomerId
  );
  if (!found) {
    const created = await zohoClient.createAccount(token, fields);
    return { path: 'create', zohoId: created.id };
  } else {
    await zohoClient.updateAccount(token, found.id, fields);
    return { path: 'update', zohoId: found.id };
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
