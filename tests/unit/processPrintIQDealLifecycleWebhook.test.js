import { processPrintIQDealLifecycleWebhook } from '../../handlers/processPrintIQDealLifecycleWebhook.js';
import * as zohoClient from '../../clients/zohoClient.js';
import * as retryStore from '../../utils/retryStore.js';

jest.mock('../../clients/zohoClient.js');
jest.mock('../../utils/retryStore.js');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('processPrintIQDealLifecycleWebhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    zohoClient.findDealByQuoteId.mockResolvedValue({ id: 'deal123' });
    zohoClient.updateDealStage.mockResolvedValue({ success: true });

    await processPrintIQDealLifecycleWebhook(req, res);

    expect(zohoClient.findDealByQuoteId).toHaveBeenCalledWith('Q1234');
    expect(zohoClient.updateDealStage).toHaveBeenCalledWith('deal123', 'Accepted', req.body);
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

    await processPrintIQDealLifecycleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ message: 'Ignored Infigo quote.' });
    expect(zohoClient.findDealByQuoteId).not.toHaveBeenCalled();
  });

  test('should return 400 if quote_id is missing', async () => {
    const req = { body: { event: 'quote_accepted', user: 'printIQ.Api.Integration' } };
    const res = mockRes();

    await processPrintIQDealLifecycleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: 'Missing Quote ID' });
  });
});
