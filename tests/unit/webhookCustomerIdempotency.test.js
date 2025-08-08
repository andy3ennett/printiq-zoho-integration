import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../src/queues/zohoQueue.js', () => ({
  addZohoJob: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../src/services/idempotency.js', () => ({
  setIfNotExists: vi.fn(),
  buildKey: vi.fn(() => 'key'),
  hashPayload: vi.fn(() => 'hash'),
}));

import router from '../../sync/routes/printiqWebhooks.js';
import { addZohoJob } from '../../src/queues/zohoQueue.js';
import { setIfNotExists } from '../../src/services/idempotency.js';

describe('customer webhook idempotency', () => {
  it('short-circuits duplicate events', async () => {
    const app = express();
    app.use(express.json());
    app.use('/webhooks/printiq', router);

    const payload = { ID: '1', Name: 'Acme' };
    setIfNotExists.mockResolvedValueOnce(true);
    setIfNotExists.mockResolvedValueOnce(false);

    await request(app)
      .post('/webhooks/printiq/customer')
      .send(payload)
      .expect(202);
    await request(app)
      .post('/webhooks/printiq/customer')
      .send(payload)
      .expect(202);

    expect(addZohoJob).toHaveBeenCalledTimes(1);
  });
});
