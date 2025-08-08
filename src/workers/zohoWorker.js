import { Worker, Queue } from 'bullmq';
import { connection, ZOHO_QUEUE_NAME } from '../queues/zohoQueue.js';
import { getValidAccessToken } from '../../sync/auth/tokenManager.js';
import { createOrUpdateCustomer } from '../../sync/clients/zohoClient.js';
import { logger, redactPII } from '../utils/logger.js';

export function backoffStrategy(attemptsMade) {
  const base = 1000 * Math.pow(2, attemptsMade);
  const jitter = Math.floor(Math.random() * 1000);
  return base + jitter;
}

export async function processor(job) {
  const start = Date.now();
  const { requestId, payload } = job.data;
  try {
    await getValidAccessToken();
    const zohoPayload = {
      Account_Name: payload.Name,
      Phone: payload.Phone,
      Website: payload.Website,
      PrintIQ_Customer_ID: payload.ID,
      PrintIQ_Customer_Code: payload.Code,
      Email: payload.Email,
      Fax: payload.Fax,
      Description: payload.Comment,
      Account_Type: payload.Active === 'Yes' ? 'Active' : 'Inactive',
      Billing_Street: payload.AddressLine1 || '',
      Billing_City: payload.City || '',
      Billing_State: payload.State || '',
      Billing_Code: payload.Postcode || '',
      Billing_Country: payload.Country || '',
    };
    await createOrUpdateCustomer(zohoPayload);
    const duration = Date.now() - start;
    logger.info(
      { requestId, jobId: job.id, attemptsMade: job.attemptsMade, duration },
      'job customer.upsert success'
    );
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(
      {
        requestId,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        duration,
        err: err?.message,
      },
      'job customer.upsert error'
    );
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
