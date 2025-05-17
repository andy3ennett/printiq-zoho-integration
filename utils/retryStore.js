// retryStore.js

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.join(__dirname, 'retryQueue.json');

const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
await db.read();
db.data ||= { retries: [] };

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 30000; // 30 seconds base

export async function saveRetry(entry) {
  entry.attempts = entry.attempts || 0;
  entry.lastTried = new Date().toISOString();
  entry.nextTry = new Date(
    Date.now() + getBackoffDelay(entry.attempts)
  ).toISOString();
  db.data.retries.push(entry);
  await db.write();
}

export async function getDueRetries() {
  const now = new Date();
  return db.data.retries.filter(
    entry => entry.attempts < MAX_ATTEMPTS && new Date(entry.nextTry) <= now
  );
}

export async function markRetryAttempted(entry) {
  entry.attempts += 1;
  entry.lastTried = new Date().toISOString();
  entry.nextTry = new Date(
    Date.now() + getBackoffDelay(entry.attempts)
  ).toISOString();
  await db.write();
}

export async function removeRetry(entry) {
  db.data.retries = db.data.retries.filter(e => e !== entry);
  await db.write();
}

function getBackoffDelay(attempts) {
  return BASE_DELAY_MS * Math.pow(2, attempts); // exponential backoff
}
