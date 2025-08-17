import { describe, test, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDealLifecycleHandler } from '../../sync/handlers/processPrintIQDealLifecycleWebhook.js';

let mockDeps;
let handler;

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe('processPrintIQDealLifecycleWebhook', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockDeps = {
      findDealByQuoteId: vi.fn(),
      updateDealStage: vi.fn(),
      logMissingDeal: vi.fn(),
      saveRetry: vi.fn(),
    };
    handler = createDealLifecycleHandler(mockDeps);
  });

  test('should update deal stage when quote_accepted event is received', async () => {
    const req = {
      body: {
        event: 'quote_accepted',
        quote_id: 'Q1234',
        status: 'Accepted',
        customer_id: 'CUST001',
        user: 'printIQ.Api.Integration',
      },
    };
    const res = mockRes();

    mockDeps.findDealByQuoteId.mockResolvedValue({ id: 'deal123' });
    mockDeps.updateDealStage.mockResolvedValue({ success: true });

    await handler(req, res);

    expect(mockDeps.findDealByQuoteId).toHaveBeenCalledWith('Q1234');
    expect(mockDeps.updateDealStage).toHaveBeenCalledWith(
      'deal123',
      'Accepted',
      req.body
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('should process printIQ quote_created events', async () => {
    const req = {
      body: {
        event: 'quote_created',
        quote_id: 'Q5555',
        status: 'Awaiting Acceptance',
        customer_id: 'CUST555',
        user: 'printIQ.Api.Integration',
      },
    };
    const res = mockRes();

    mockDeps.findDealByQuoteId.mockResolvedValue({ id: 'deal555' });
    mockDeps.updateDealStage.mockResolvedValue({ success: true });

    await handler(req, res);

    expect(mockDeps.findDealByQuoteId).toHaveBeenCalledWith('Q5555');
    expect(mockDeps.updateDealStage).toHaveBeenCalledWith(
      'deal555',
      'Quote Requested',
      req.body
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('should skip processing if source is not printIQ', async () => {
    const req = {
      body: {
        event: 'quote_created',
        quote_id: 'Q9999',
        status: 'Awaiting Acceptance',
        customer_id: 'CUST999',
        user: 'infigo.user',
      },
    };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ message: 'Ignored Infigo quote.' });
    expect(mockDeps.findDealByQuoteId).not.toHaveBeenCalled();
  });

  test('should return 400 if quote_id is missing', async () => {
    const req = {
      body: { event: 'quote_accepted', user: 'printIQ.Api.Integration' },
    };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: 'Missing Quote ID' });
  });

  test('should return 400 for unsupported event type', async () => {
    const req = {
      body: { event: 'foo', quote_id: 'Q1', user: 'printIQ.Api.Integration' },
    };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Unsupported event type.',
    });
  });

  test('exposes metrics when enabled', async () => {
    process.env.ENABLE_METRICS = 'true';
    const { metricsMiddleware, metricsRoute } = await import(
      '../../src/middleware/metrics.js'
    );

    const app = express();
    app.use(express.json());
    app.use(metricsMiddleware);
    app.post('/webhooks/printiq/quote', handler);
    metricsRoute(app);

    mockDeps.findDealByQuoteId.mockResolvedValue({ id: 'deal777' });
    mockDeps.updateDealStage.mockResolvedValue({ success: true });

    await request(app)
      .post('/webhooks/printiq/quote')
      .send({
        event: 'quote_created',
        quote_id: 'Q777',
        user: 'printIQ.Api.Integration',
      })
      .expect(200);

    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.text).toMatch(/http_requests_total/);

    delete process.env.ENABLE_METRICS;
  });
});
