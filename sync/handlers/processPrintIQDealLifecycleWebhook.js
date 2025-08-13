// processPrintIQDealLifecycleWebhook.js

import {
  findDealByQuoteId,
  updateDealStage,
  logMissingDeal,
} from '../../clients/zohoClient.js';
import { saveRetry } from '../../utils/retryStore.js';

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

export function createDealLifecycleHandler({
  findDealByQuoteId,
  updateDealStage,
  logMissingDeal,
  saveRetry,
}) {
  return async function processPrintIQDealLifecycleWebhook(req, res) {
    try {
      const payload = req.body;
      const event = payload.event?.toLowerCase();
      const username = payload.user;

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
        await saveRetry({
          event,
          quoteId,
          error_type: 'NOT_FOUND',
          last_error_message: 'Deal not found by Quote ID',
          payload,
        });
        return res
          .status(202)
          .send({ message: 'Retry queued: deal not found.' });
      }

      const targetStage = stageMap[event];
      await updateDealStage(deal.id, targetStage, payload);
      res.status(200).send({ message: 'Deal updated successfully.' });
    } catch (error) {
      console.error('Sync error:', error);
      await saveRetry({
        error_type: 'EXCEPTION',
        last_error_message: error.message,
        payload: req.body,
      });
      res.status(500).send({ message: 'Internal server error.' });
    }
  };
}

export const processPrintIQDealLifecycleWebhook = createDealLifecycleHandler({
  findDealByQuoteId,
  updateDealStage,
  logMissingDeal,
  saveRetry,
});
