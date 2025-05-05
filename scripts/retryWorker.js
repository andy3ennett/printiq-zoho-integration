// scripts/retryWorker.js

import { getDueRetries, markRetryAttempted, removeRetry } from '../utils/retryStore.js';
import { processPrintIQDealLifecycleWebhook } from '../handlers/processPrintIQDealLifecycleWebhook.js';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';

dotenv.config();

const RETRY_MODE = process.env.RETRY_MODE?.toLowerCase() === 'on';
const RETRY_INTERVAL_MS = parseInt(process.env.RETRY_INTERVAL_MS) || 60000;

const app = express();
app.use(express.json());

function createMockReqRes(payload) {
  const req = { body: payload };
  const res = {
    status: (code) => ({
      send: (msg) => console.log(`[${code}]`, msg),
    }),
  };
  return { req, res };
}

async function runRetries() {
  const now = new Date().toISOString();
  console.log(`\n🔁 Retry run at ${now}`);

  const retries = await getDueRetries();
  if (retries.length === 0) {
    console.log('No retries due.');
    return;
  }

  console.log(`Retrying ${retries.length} failed sync(s)...`);
  for (const entry of retries) {
    try {
      const { req, res } = createMockReqRes(entry.payload);
      await processPrintIQDealLifecycleWebhook(req, res);
      await removeRetry(entry);
    } catch (err) {
      console.error('Retry attempt failed:', err.message);
      await markRetryAttempted(entry);
    }
  }
}

if (RETRY_MODE) {
  await runRetries();
  setInterval(runRetries, RETRY_INTERVAL_MS);
} else {
  console.log('Retry mode is OFF. Set RETRY_MODE=on in .env to enable.');
}
