import { Router } from 'express';
import { enqueueCustomerUpsert } from '../../src/queues/zohoQueue.js';
import { setOnce } from '../../src/services/idempotency.js';

export async function processPrintIQCustomerWebhook(req, res) {
  const { id, event, printiqCustomerId, name } = req.body || {};
  if (!id || !event || !printiqCustomerId) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const idemKey = `printiq:${event}:${id}`;
  const fresh = await setOnce(idemKey, 1800);

  // Return 202 for idempotent repeat as well
  if (!fresh) return res.status(202).json({ deduped: true });

  await enqueueCustomerUpsert({ requestId: req.id, printiqCustomerId, name });
  return res.status(202).json({ queued: true });
}

export const printiqCustomerRouter = Router();
printiqCustomerRouter.post(
  '/webhooks/printiq/customer',
  processPrintIQCustomerWebhook
);

export default printiqCustomerRouter;
