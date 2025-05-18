import request from 'supertest';
import express from 'express';
import fs from 'fs';
// Removed unused import 'path'
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createDealLifecycleHandler } from '../../sync/handlers/processPrintIQDealLifecycleWebhook.js';

vi.mock('fs');

describe('CLI Simulation: deal lifecycle', () => {
  let app;
  let mockDeps;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockDeps = {
      findDealByQuoteId: vi.fn().mockResolvedValue({ id: 'deal123' }),
      updateDealStage: vi.fn().mockResolvedValue(true),
      logMissingDeal: vi.fn(),
      saveRetry: vi.fn(),
    };

    const handler = createDealLifecycleHandler(mockDeps);

    app = express();
    app.use(express.json());
    app.post('/deal-lifecycle', handler);
  });

  test('should process quote_accepted event from mock CLI payload', async () => {
    // Removed unused variable mockPayloadPath
    const mockPayload = {
      event: 'quote_accepted',
      quote_id: 'Q1234',
      status: 'Accepted',
      customer_id: 'CUST123',
      user: 'printIQ.Api.Integration',
    };

    fs.readFileSync.mockReturnValue(JSON.stringify(mockPayload));

    const response = await request(app)
      .post('/deal-lifecycle')
      .send(mockPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(mockDeps.findDealByQuoteId).toHaveBeenCalledWith('Q1234');
    expect(mockDeps.updateDealStage).toHaveBeenCalledWith(
      'deal123',
      'Accepted',
      mockPayload
    );
  });
  test('should process job_converted event from mock CLI payload', async () => {
    const mockPayload = {
      event: 'job_converted',
      quote_id: 'Q2345',
      status: 'Converted',
      customer_id: 'CUST234',
      user: 'printIQ.Api.Integration',
    };

    const response = await request(app)
      .post('/deal-lifecycle')
      .send(mockPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(mockDeps.findDealByQuoteId).toHaveBeenCalledWith('Q2345');
    expect(mockDeps.updateDealStage).toHaveBeenCalledWith(
      'deal123',
      'Job Converted',
      mockPayload
    );
  });

  test('should process invoice_created event from mock CLI payload', async () => {
    const mockPayload = {
      event: 'invoice_created',
      quote_id: 'Q3456',
      status: 'Invoiced',
      customer_id: 'CUST345',
      user: 'printIQ.Api.Integration',
    };

    const response = await request(app)
      .post('/deal-lifecycle')
      .send(mockPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(mockDeps.findDealByQuoteId).toHaveBeenCalledWith('Q3456');
    expect(mockDeps.updateDealStage).toHaveBeenCalledWith(
      'deal123',
      'Invoiced',
      mockPayload
    );
  });

  test('should process quote_cancelled event from mock CLI payload', async () => {
    const mockPayload = {
      event: 'quote_cancelled',
      quote_id: 'Q4567',
      status: 'Cancelled',
      customer_id: 'CUST456',
      user: 'printIQ.Api.Integration',
    };

    const response = await request(app)
      .post('/deal-lifecycle')
      .send(mockPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(mockDeps.findDealByQuoteId).toHaveBeenCalledWith('Q4567');
    expect(mockDeps.updateDealStage).toHaveBeenCalledWith(
      'deal123',
      'Cancelled',
      mockPayload
    );
  });
  test('should return 400 for unknown event type', async () => {
    const mockPayload = {
      event: 'unknown_event',
      quote_id: 'Q9999',
      status: 'Unknown',
      customer_id: 'CUST999',
      user: 'printIQ.Api.Integration',
    };

    const response = await request(app)
      .post('/deal-lifecycle')
      .send(mockPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.text).toMatch(/Unsupported event/i);
  });

  test('should return 400 for malformed payload', async () => {
    const mockPayload = {
      status: 'Accepted', // Missing required fields like event, quote_id
    };

    const response = await request(app)
      .post('/deal-lifecycle')
      .send(mockPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.text).toMatch(/Unsupported event/i);
  });
});
