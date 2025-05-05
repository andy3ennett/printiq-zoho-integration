// routes/webhooks.js
const express = require('express');
const router = express.Router();
const { processPrintIQCustomerWebhook } = require('../sync/webhookHandler');
const { handleQuoteAcceptedWebhook } = require('../sync/handlers');
const {
  handleAddressWebhook,
} = require('../sync/handlers/handleAddressWebhook');

// 🔔 Customer Created/Updated from PrintIQ
router.post('/printiq/customer', async (req, res) => {
  try {
    await processPrintIQCustomerWebhook(req.body);
    res.status(200).send('✅ Customer webhook processed successfully.');
  } catch (error) {
    console.error('❌ Customer webhook error:', error.message);
    res.status(500).send('❌ Failed to process customer webhook.');
  }
});

// 📄 Quote Accepted Webhook
router.post('/printiq/quote-accepted', async (req, res) => {
  try {
    await handleQuoteAcceptedWebhook(req.body);
    res.status(200).send('✅ Quote Accepted webhook processed successfully.');
  } catch (error) {
    console.error('❌ Quote webhook error:', error.message);
    res.status(500).send('❌ Failed to process Quote Accepted webhook.');
  }
});

// 📦 Add more webhook routes here as we go...

// 🏠 Address Webhook
router.post('/printiq/address', async (req, res) => {
  try {
    await handleAddressWebhook(req.body);
    res.status(200).send('✅ Address webhook processed successfully.');
  } catch (error) {
    console.error('❌ Address webhook error:', error.message);
    res.status(500).send('❌ Failed to process address webhook.');
  }
});

module.exports = router;
