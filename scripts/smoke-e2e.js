// scripts/smoke-e2e.js
import axios from 'axios';
import pkg from 'bullmq';
import IORedis from 'ioredis';
import crypto from 'node:crypto';

const { Queue } = pkg;

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'zoho';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
const queue = new Queue(QUEUE_NAME, { connection });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(
  predicate,
  { timeoutMs = 15000, intervalMs = 300 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await sleep(intervalMs);
  }
  return false;
}

async function getCounts() {
  const [waiting, active, delayed, failed, completed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
    queue.getCompletedCount(),
  ]);
  return { waiting, active, delayed, failed, completed };
}

async function postCustomer(body) {
  const res = await axios.post(`${BASE}/webhooks/printiq/customer`, body, {
    headers: {
      'content-type': 'application/json',
      'x-request-id': crypto.randomUUID(),
    },
    timeout: 5000,
  });
  return res.data;
}

async function main() {
  console.log('🔎 Checking readiness…');
  const ready = await axios
    .get(`${BASE}/readyz`, { timeout: 5000 })
    .then(r => r.data.ready)
    .catch(() => false);
  if (!ready) {
    console.error(
      '❌ Service not ready. Start worker+api (npm run dev:all) and ensure Zoho/Redis are healthy.'
    );
    process.exit(1);
  }
  console.log('✅ Ready');

  // SUCCESS PATH
  const okId = `evt_ok_${Date.now()}`;
  console.log(`➡️  Enqueue success job id=${okId}`);
  const okResp = await postCustomer({
    event: 'customer.updated',
    id: okId,
    printiqCustomerId: 999,
    name: 'Acme Ltd',
  });
  if (!okResp.queued) {
    console.error('❌ Expected {queued:true} for success job, got:', okResp);
    process.exit(1);
  }

  const okDone = await waitFor(
    async () => {
      const c = await getCounts();
      return c.completed > 0;
    },
    { timeoutMs: 10000, intervalMs: 250 }
  );

  if (!okDone) {
    console.error('❌ Success job did not complete within timeout.');
    console.error('Counts:', await getCounts());
    process.exit(1);
  }
  console.log('✅ Success job completed');

  // FAILURE PATH (fast-fail via forceFail)
  const failId = `evt_fail_${Date.now()}`;
  console.log(`➡️  Enqueue failing job id=${failId}`);
  const failResp = await postCustomer({
    event: 'customer.updated',
    id: failId,
    printiqCustomerId: 999,
    name: 'Acme Ltd',
    forceFail: true,
  });
  if (!failResp.queued) {
    console.error(
      '❌ Expected {queued:true} for failing job enqueue, got:',
      failResp
    );
    process.exit(1);
  }

  const failedSoon = await waitFor(
    async () => {
      const c = await getCounts();
      return c.failed > 0;
    },
    { timeoutMs: 5000, intervalMs: 200 }
  );

  if (!failedSoon) {
    console.error(
      '❌ Failing job did not hit DLQ quickly. Counts:',
      await getCounts()
    );
    process.exit(1);
  }
  console.log('✅ Failing job landed in DLQ');

  console.log('🎉 E2E smoke passed.');
}

main()
  .catch(e => {
    console.error('❌ Smoke errored:', e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await queue.close();
    } catch {}
    try {
      await connection.quit();
    } catch {}
  });
