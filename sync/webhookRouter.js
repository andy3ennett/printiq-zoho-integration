const express = require('express');
const router = express.Router();

// Handlers (each one modularized under webhookHandlers/)
const handleQuoteAccepted = require('./webhookHandlers/quoteAccepted');
const handleCustomerUpdated = require('./webhookHandlers/customerUpdated');
const handleJobStatusUpdated = require('./webhookHandlers/jobStatusUpdated');

// POST /webhook/printiq/quote-accepted
router.post('/printiq/quote-accepted', async (req, res) => {
  try {
    await handleQuoteAccepted(req.body);
    res.status(200).send('Quote Accepted processed.');
  } catch (err) {
    console.error('Error handling quote-accepted webhook:', err);
    res.status(500).send('Error processing quote accepted.');
  }
});

// POST /webhook/printiq/customer-updated
router.post('/printiq/customer-updated', async (req, res) => {
  try {
    await handleCustomerUpdated(req.body);
    res.status(200).send('Customer Updated processed.');
  } catch (err) {
    console.error('Error handling customer-updated webhook:', err);
    res.status(500).send('Error processing customer update.');
  }
});

// POST /webhook/printiq/job-status-updated
router.post('/printiq/job-status-updated', async (req, res) => {
  try {
    await handleJobStatusUpdated(req.body);
    res.status(200).send('Job status update processed.');
  } catch (err) {
    console.error('Error handling job-status-updated webhook:', err);
    res.status(500).send('Error processing job status update.');
  }
});

module.exports = router;
