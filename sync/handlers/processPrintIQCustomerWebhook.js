import { z } from 'zod';
import { addZohoJob } from '../../src/queues/zohoQueue.js';
import {
  setIfNotExists,
  buildKey,
  hashPayload,
} from '../../src/services/idempotency.js';
import { logger } from '../../src/utils/logger.js';
import { v4 as uuid } from 'uuid';

const payloadSchema = z.object({
  ID: z.coerce.string().optional(),
  Name: z.string(),
  Phone: z.string().optional(),
  Website: z.string().optional(),
  Code: z.string().optional(),
  Email: z.string().optional(),
  Fax: z.string().optional(),
  Comment: z.string().optional(),
  Active: z.string().optional(),
  AddressLine1: z.string().optional(),
  City: z.string().optional(),
  State: z.string().optional(),
  Postcode: z.string().optional(),
  Country: z.string().optional(),
});

export async function processPrintIQCustomerWebhook(req, res) {
  const parsed = payloadSchema.parse(req.body || {});
  const eventId = parsed.ID || hashPayload(parsed);
  const key = buildKey('customer', eventId);
  const isNew = await setIfNotExists(key, 30 * 60);
  if (!isNew) {
    logger.info({ eventId }, 'duplicate customer webhook');
    return res.status(202).send('Accepted');
  }

  const jobPayload = {
    requestId: req.headers['x-request-id'] || uuid(),
    source: 'printiq',
    payload: parsed,
  };

  await addZohoJob('customer.upsert', jobPayload);
  res.status(202).send('Accepted');
}
