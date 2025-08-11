import { z } from 'zod';
import { enqueueCustomerUpsert } from '../../src/queues/zohoQueue.js';
import {
  setIfNotExists,
  buildKey,
  hashPayload,
} from '../../src/services/idempotency.js';
import { logger } from '../../src/utils/logger.js';
import { v4 as uuid } from 'uuid';

const payloadSchema = z.object({
  id: z.string().optional(),
  event: z.string().optional(),
  printiqCustomerId: z.union([z.string(), z.number()]),
  name: z.string(),
  forceFail: z.boolean().optional(),
});

export async function processPrintIQCustomerWebhook(req, res) {
  const parsed = payloadSchema.parse(req.body || {});
  const eventId = parsed.id || hashPayload(parsed);
  const key = buildKey('customer', eventId);
  const isNew = await setIfNotExists(key, 30 * 60);
  if (!isNew) {
    logger.info({ eventId }, 'duplicate customer webhook');
    return res.status(202).send('Accepted');
  }

  const jobPayload = {
    requestId: req.headers['x-request-id'] || uuid(),
    ...parsed,
  };

  await enqueueCustomerUpsert(jobPayload);
  res.status(202).json({ queued: true });
}
