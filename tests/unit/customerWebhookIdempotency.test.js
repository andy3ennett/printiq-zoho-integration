// tests/integration/customerWebhookIdempotency.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the idempotency + queue used by the router
const setOnceMock = vi.fn();
vi.mock('../../src/services/idempotency.js', () => ({
  setOnce: (...args) => setOnceMock(...args),
}));

const enqueueMock = vi.fn(async () => ({ id: 'job-123' }));
vi.mock('../../src/queues/zohoQueue.js', () => ({
  enqueueCustomerUpsert: (...args) => enqueueMock(...args),
}));

// Import after mocks
import { printiqCustomerRouter } from '../../sync/handlers/processPrintIQCustomerWebhook.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(printiqCustomerRouter);
  return app;
}

describe('Customer webhook → idempotency + enqueue', () => {
  beforeEach(() => {
    setOnceMock.mockReset();
    enqueueMock.mockReset();
  });

  it('queues on first event and dedupes on repeat', async () => {
    const app = makeApp();
    const body = {
      event: 'customer.updated',
      id: 'evt_1',
      printiqCustomerId: 999,
      name: 'Acme Ltd',
    };

    // First call: allow setOnce → true
    setOnceMock.mockResolvedValueOnce(true);

    const res1 = await request(app)
      .post('/webhooks/printiq/customer')
      .set('content-type', 'application/json')
      .send(body);

    expect(res1.status).toBe(202);
    expect(res1.body).toEqual({ queued: true });
    expect(enqueueMock).toHaveBeenCalledTimes(1);

    // Second call: setOnce → false (duplicate)
    setOnceMock.mockResolvedValueOnce(false);

    const res2 = await request(app)
      .post('/webhooks/printiq/customer')
      .set('content-type', 'application/json')
      .send(body);

    expect(res2.status).toBe(202);
    expect(res2.body).toEqual({ deduped: true });
    expect(enqueueMock).toHaveBeenCalledTimes(1); // still 1 (no new enqueue)
  });
});
