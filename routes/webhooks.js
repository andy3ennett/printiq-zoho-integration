import express from 'express';
import processPrintIQCustomerWebhook from '../sync/handlers/processPrintIQCustomerWebhook.js';
import processPrintIQContactWebhook from '../sync/handlers/processPrintIQContactWebhook.js';
import processPrintIQAddressWebhook from '../sync/handlers/processPrintIQAddressWebhook.js';
// import processQuoteAcceptedWebhook from '../sync/handlers/processQuoteAcceptedWebhook.js'; // Enable when needed

const router = express.Router();

const withWebhookHandler = handler => async (req, res) => {
  try {
    await handler(req.body);
    res.status(200).send('Webhook processed successfully.');
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).send('Failed to process webhook.');
  }
};

router.post(
  '/webhook/printiq/customer',
  withWebhookHandler(processPrintIQCustomerWebhook)
);
router.post(
  '/webhook/printiq/contact',
  withWebhookHandler(processPrintIQContactWebhook)
);
router.post(
  '/webhook/printiq/address',
  withWebhookHandler(processPrintIQAddressWebhook)
);
// router.post('/webhook/printiq/quote-accepted', withWebhookHandler(processQuoteAcceptedWebhook)); // Optional

export default router;
