import express from 'express';
import { processPrintIQDealLifecycleWebhook } from '../handlers/processPrintIQDealLifecycleWebhook.js';
import { processPrintIQCustomerWebhook } from '../handlers/processPrintIQCustomerWebhook.js';
import { processPrintIQContactWebhook } from '../handlers/processPrintIQContactWebhook.js';
import { processPrintIQAddressWebhook } from '../handlers/processPrintIQAddressWebhook.js';

const router = express.Router();

router.post('/deal-lifecycle', processPrintIQDealLifecycleWebhook);
router.post('/quote', processPrintIQDealLifecycleWebhook);
router.post('/job', processPrintIQDealLifecycleWebhook);
router.post('/quote-rejected', processPrintIQDealLifecycleWebhook);
router.post('/quote-discarded', processPrintIQDealLifecycleWebhook);
router.post('/customer', processPrintIQCustomerWebhook);
router.post('/contact', processPrintIQContactWebhook);
router.post('/address', processPrintIQAddressWebhook);

export default router;
