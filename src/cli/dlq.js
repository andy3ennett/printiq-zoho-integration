#!/usr/bin/env node

import pkg from 'bullmq';
const { Queue } = pkg; // QueueScheduler not required for listing/retrying

import IORedis from 'ioredis';
import { env } from '../config/env.js';

// BullMQ requires this option to support blocking commands
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

// Must match the queue name used by producers/workers
const QUEUE_NAME = 'zoho';
const queue = new Queue(QUEUE_NAME, { connection });

async function listDLQ() {
  const failedJobs = await queue.getFailed(0, 1000); // list up to 1000
  if (!failedJobs.length) {
    console.log('✅ DLQ is empty.');
    return;
  }
  console.log(`❌ ${failedJobs.length} job(s) in DLQ:`);
  for (const job of failedJobs) {
    console.log(`- ID: ${job.id}`);
    console.log(`  Name: ${job.name}`);
    console.log(`  Attempts: ${job.attemptsMade}`);
    console.log(`  Failed Reason: ${job.failedReason || '(no reason)'}\n`);
  }
}

async function retryDLQ() {
  const failedJobs = await queue.getFailed(0, 1000);
  if (!failedJobs.length) {
    console.log('✅ DLQ is empty, nothing to retry.');
    return;
  }
  let ok = 0,
    err = 0;
  for (const job of failedJobs) {
    try {
      console.log(`♻️  Retrying job ${job.id} (${job.name})`);
      await job.retry();
      ok++;
    } catch (e) {
      console.error(`   ↳ retry failed: ${e?.message || e}`);
      err++;
    }
  }
  console.log(`✅ Retried ${ok} job(s). ${err ? `❌ ${err} failed.` : ''}`);
}

async function showStates() {
  const [w, a, d, f] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
  ]);
  console.log(
    JSON.stringify({ waiting: w, active: a, delayed: d, failed: f }, null, 2)
  );
}

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === 'list') {
      await listDLQ();
    } else if (cmd === 'retry') {
      await retryDLQ();
    } else if (cmd === 'states') {
      await showStates();
    } else {
      console.error('Usage: dlq.js <list|retry|states>');
      process.exitCode = 1;
    }
  } finally {
    await queue.close();
    await connection.quit();
  }
}

main().catch(async e => {
  console.error(e?.stack || e?.message || String(e));
  try {
    await queue?.close();
  } catch {}
  try {
    await connection?.quit();
  } catch {}
  process.exit(1);
});
