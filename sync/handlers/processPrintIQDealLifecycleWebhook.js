// processPrintIQDealLifecycleWebhook.js

import {
  findDealByQuoteId,
  updateDealStage,
  logMissingDeal,
} from '../../clients/zohoClient.js';
import { saveRetry } from './retryStore.js';

const VALID_EVENTS = [
  'quote_created',
  'quote_accepted',
  'job_converted',
  'invoice_created',
  'quote_cancelled',
  'job_cancelled',
];

const stageMap = {
  quote_created: 'Quote Requested',
  quote_accepted: 'Accepted',
  job_converted: 'Job Converted',
  invoice_created: 'Invoiced',
  quote_cancelled: 'Cancelled',
  job_cancelled: 'Cancelled',
};

export async function processPrintIQDealLifecycleWebhook(req, res) {
  try {
    const payload = req.body;
    const event = payload.event?.toLowerCase();
    const username = payload.username;

    if (!VALID_EVENTS.includes(event)) {
      return res.status(400).send({ message: 'Unsupported event type.' });
    }

    // Filter out Infigo unless accepted
    if (username !== 'printIQ.Api.Integration' && event === 'quote_created') {
      return res.status(200).send({ message: 'Ignored Infigo quote.' });
    }

    const quoteId = payload.quote_id;
    if (!quoteId) {
      return res.status(400).send({ message: 'Missing Quote ID' });
    }

    const deal = await findDealByQuoteId(quoteId);
    if (!deal) {
      await logMissingDeal(quoteId, event);
      await saveRetry({ event, quoteId, reason: 'NOT_FOUND', payload });
      return res
        .status(404)
        .send({ message: 'Deal not found, added to retry queue.' });
    }

    const targetStage = stageMap[event];
    await updateDealStage(deal.id, targetStage, payload);
    res.status(200).send({ message: 'Deal updated successfully.' });
  } catch (error) {
    console.error('Sync error:', error);
    await saveRetry({
      reason: 'EXCEPTION',
      payload: req.body,
      error: error.message,
    });
    res.status(500).send({ message: 'Internal server error.' });
  }
}
