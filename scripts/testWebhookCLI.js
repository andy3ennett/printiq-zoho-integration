// scripts/testWebhookCLI.js

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCKS_DIR = path.join(__dirname, 'mockPayloads');

function getEndpointForFile(file) {
  if (file.includes('quote_accepted')) return '/webhooks/printiq/job';
  if (file.includes('quote_created')) return '/webhooks/printiq/quote';
  if (file.includes('quote_rejected'))
    return '/webhooks/printiq/quote-rejected';
  if (file.includes('quote_discarded'))
    return '/webhooks/printiq/quote-discarded';
  if (file.includes('customer')) return '/webhooks/printiq/customer';
  if (file.includes('contact')) return '/webhooks/printiq/contact';
  if (file.includes('address')) return '/webhooks/printiq/address';
  return '/webhooks/printiq/deal-lifecycle';
}

const BASE_URL = process.env.TEST_WEBHOOK_URL || 'http://localhost:3000';

async function sendMockEvent(mockFile) {
  try {
    const filePath = path.join(MOCKS_DIR, mockFile);
    console.log('📄 Reading file from:', filePath);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    console.log('📦 Payload:', data);
    const endpoint = getEndpointForFile(mockFile);
    console.log(`👉 Posting to ${BASE_URL}${endpoint}`);
    const response = await axios.post(`${BASE_URL}${endpoint}`, data);
    console.log(
      `✅ Sent ${mockFile}: [${response.status}] ${response.statusText}`
    );
  } catch (err) {
    console.error(`❌ Error sending ${mockFile}:`, err.message);
  }
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node testWebhookCLI.js <mock-file.json>');
    console.log('       node testWebhookCLI.js all');
    return;
  }

  const files = await fs.readdir(MOCKS_DIR);

  if (args[0] === 'all') {
    for (const file of files) {
      if (file.endsWith('.json')) await sendMockEvent(file);
    }
  } else if (files.includes(args[0])) {
    await sendMockEvent(args[0]);
  } else {
    console.error(`❌ Mock file not found: ${args[0]}`);
  }
}

run();
