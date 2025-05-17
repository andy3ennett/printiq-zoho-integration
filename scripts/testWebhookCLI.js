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
const WEBHOOK_ENDPOINT =
  process.env.TEST_WEBHOOK_URL || 'http://localhost:3000/deal-lifecycle';

async function sendMockEvent(mockFile) {
  try {
    const filePath = path.join(MOCKS_DIR, mockFile);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const response = await axios.post(WEBHOOK_ENDPOINT, data);
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
