import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const setIfNotExistsMock = vi.fn();
vi.mock('../../src/services/idempotency.js', () => ({
  setIfNotExists: (...args) => setIfNotExistsMock(...args),
  buildKey: (_t, id) => `printiq:customer:${id}`,
  hashPayload: () => 'hash',
}));

const addZohoJobMock = vi.fn(async () => ({ id: 'job-123' }));
vi.mock('../../src/queues/zohoQueue.js', () => ({
  enqueueCustomerUpsert: (...args) => addZohoJobMock(...args),
}));

import printiqWebhooks from '../../sync/routes/printiqWebhooks.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/webhooks/printiq', printiqWebhooks);
  return app;
}

describe('Customer webhook → idempotency + enqueue', () => {
  beforeEach(() => {
    setIfNotExistsMock.mockReset();
    addZohoJobMock.mockReset();
  });

  it('queues on first event and dedupes on repeat', async () => {
    const app = makeApp();
    const body = {
      id: 'evt_1',
      printiqCustomerId: 123,
      name: 'Acme Ltd',
    };

    setIfNotExistsMock.mockResolvedValueOnce(true);
    const res1 = await request(app)
      .post('/webhooks/printiq/customer')
      .set('content-type', 'application/json')
      .send(body);
    expect(res1.status).toBe(202);
    expect(res1.body.queued).toBe(true);
    expect(addZohoJobMock).toHaveBeenCalledTimes(1);

    setIfNotExistsMock.mockResolvedValueOnce(false);
    const res2 = await request(app)
      .post('/webhooks/printiq/customer')
      .set('content-type', 'application/json')
      .send(body);
    expect(res2.status).toBe(202);
    expect(addZohoJobMock).toHaveBeenCalledTimes(1);
  });
});
