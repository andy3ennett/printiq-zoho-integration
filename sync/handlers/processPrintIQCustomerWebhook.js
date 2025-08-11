import express from 'express';
import { createOrUpdateCustomer } from '../clients/zohoClient.js';
import { getValidAccessToken } from '../auth/tokenManager.js';
import syncLogger from '../../logs/syncLogger.js';

import { setOnce } from '../services/idempotency.js';
import { enqueueCustomerUpsert } from '../queues/zohoQueue.js';

// Export an Express Router instead of referencing a global `app`
export const printiqCustomerRouter = express.Router();

// NOTE: Ensure `app.use(express.json())` is called in index.js before mounting this router.
printiqCustomerRouter.post('/webhooks/printiq/customer', async (req, res) => {
  try {
    const {
      event = 'customer.updated',
      id: eventId,
      printiqCustomerId,
      ...rest
    } = req.body || {};
    const key = `printiq:${event}:${eventId || printiqCustomerId || 'unknown'}`;

    const first = await setOnce(key, 1800); // 30 minutes TTL
    if (!first) {
      syncLogger?.info?.(`🔁 Duplicate customer event suppressed: ${key}`);
      return res.status(202).json({ deduped: true });
    }

    await enqueueCustomerUpsert({
      printiqCustomerId,
      ...rest,
      requestId: req.id,
    });

    return res.status(202).json({ queued: true });
  } catch (err) {
    syncLogger?.error?.(
      `❌ Failed to enqueue customer upsert: ${err?.message || err}`
    );
    return res.status(500).json({ error: 'enqueue_failed' });
  }
});

// Legacy processor kept for compatibility with existing tests/flows.
export async function processPrintIQCustomerWebhook(payload) {
  try {
    await getValidAccessToken();

    const {
      ID,
      Name,
      Phone,
      Website,
      Code,
      Email,
      Fax,
      Comment,
      Active,
      AddressLine1,
      City,
      State,
      Postcode,
      Country,
    } = payload;

    if (!ID || !Name) {
      syncLogger.warn('⚠️ Skipping customer webhook: Missing ID or Name.');
      return;
    }

    const zohoPayload = {
      Account_Name: Name,
      Phone,
      Website,
      PrintIQ_Customer_ID: ID,
      PrintIQ_Customer_Code: Code,
      Email,
      Fax,
      Description: Comment,
      Account_Type: Active === 'Yes' ? 'Active' : 'Inactive',
      Billing_Street: AddressLine1 || '',
      Billing_City: City || '',
      Billing_State: State || '',
      Billing_Code: Postcode || '',
      Billing_Country: Country || '',
    };

    await createOrUpdateCustomer(zohoPayload);
    syncLogger.success(`✅ Synced customer in Zoho CRM: ${Name}`);
  } catch (err) {
    syncLogger.error(`❌ Error handling customer webhook: ${err.message}`);
  }
}
