import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createDealLifecycleHandler } from '../../sync/handlers/processPrintIQDealLifecycleWebhook.js';

let mockDeps;
let handler;

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe('deal lifecycle retry logic', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDeps = {
      findDealByQuoteId: vi.fn(),
      updateDealStage: vi.fn(),
      logMissingDeal: vi.fn(),
      saveRetry: vi.fn(),
    };
    handler = createDealLifecycleHandler(mockDeps);
  });

  test('should retry when Zoho returns NOT_FOUND error', async () => {
    const req = {
      body: {
        event: 'quote_accepted',
        quote_id: 'Q5678',
        status: 'Accepted',
        customer_id: 'CUST567',
        user: 'printIQ.Api.Integration',
      },
    };
    const res = mockRes();

    mockDeps.findDealByQuoteId.mockResolvedValue(null); // Simulate NOT_FOUND
    mockDeps.saveRetry.mockResolvedValue(true);

    await handler(req, res);

    expect(mockDeps.findDealByQuoteId).toHaveBeenCalledWith('Q5678');
    expect(mockDeps.saveRetry).toHaveBeenCalledWith({
      payload: req.body,
      error_type: 'NOT_FOUND',
      last_error_message: 'Deal not found by Quote ID',
      event: 'quote_accepted',
      quoteId: 'Q5678',
    });
    expect(res.status).toHaveBeenCalledWith(202);
  });

  test('should retry when updateDealStage throws exception', async () => {
    const req = {
      body: {
        event: 'quote_accepted',
        quote_id: 'Q7777',
        status: 'Accepted',
        customer_id: 'CUST777',
        user: 'printIQ.Api.Integration',
      },
    };
    const res = mockRes();

    mockDeps.findDealByQuoteId.mockResolvedValue({ id: 'deal777' });
    mockDeps.updateDealStage.mockRejectedValue(new Error('Zoho API failure'));
    mockDeps.saveRetry.mockResolvedValue(true);

    await handler(req, res);

    expect(mockDeps.updateDealStage).toHaveBeenCalledWith(
      'deal777',
      'Accepted',
      req.body
    );
    expect(mockDeps.saveRetry).toHaveBeenCalledWith({
      payload: req.body,
      error_type: 'EXCEPTION',
      last_error_message: 'Zoho API failure',
    });
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
