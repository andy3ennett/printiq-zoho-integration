import { vi, describe, beforeEach, test, expect } from 'vitest';

// --- Define mocks before importing the worker ---
vi.mock('../../src/services/zoho.client.js', () => ({
  __esModule: true,
  searchAccountByExternalId: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

vi.mock('../../sync/auth/tokenManager.js', () => ({
  __esModule: true,
  getAccessToken: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('../../src/mappings/customer.js', () => ({
  __esModule: true,
  mapCustomerToAccount: vi.fn(({ printiqCustomerId, name }) => ({
    Account_Name: name,
    PrintIQ_Customer_ID: String(printiqCustomerId),
  })),
}));

// Import after mocks so the worker sees mocked modules
import * as zoho from '../../src/services/zoho.client.js';
import { mapCustomerToAccount } from '../../src/mappings/customer.js';
import { processor } from '../../src/workers/zohoWorker.js';

function makeNonRetryableError(message = 'bad') {
  const NonRetryable = globalThis.NonRetryableError;
  if (typeof NonRetryable === 'function') {
    return new NonRetryable(message);
  }
  const err = new Error(message);
  err.name = 'NonRetryableError';
  err.nonRetryable = true;
  return err;
}

describe('customer upsert processor e2e', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('creates account when missing', async () => {
    const job = { data: { printiqCustomerId: 1, name: 'Acme' } };

    zoho.searchAccountByExternalId.mockResolvedValueOnce(null);
    const createdPayload = { id: 'z1', data: [{ details: { id: 'z1' } }] };
    zoho.createAccount.mockResolvedValueOnce(createdPayload);

    const result = await processor(job);

    expect(zoho.searchAccountByExternalId).toHaveBeenCalledWith(
      'test-token',
      1
    );
    expect(mapCustomerToAccount).toHaveBeenCalledWith({
      printiqCustomerId: 1,
      name: 'Acme',
    });
    expect(zoho.createAccount).toHaveBeenCalledTimes(1);
    expect(zoho.updateAccount).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ path: 'create', zohoId: expect.any(String) })
    );
  });

  test('updates account when exists', async () => {
    const job = { data: { printiqCustomerId: 2, name: 'Beta' } };

    zoho.searchAccountByExternalId.mockResolvedValueOnce({ id: 'z2' });
    zoho.updateAccount.mockResolvedValueOnce({ success: true });

    const result = await processor(job);

    expect(zoho.searchAccountByExternalId).toHaveBeenCalledWith(
      'test-token',
      2
    );
    expect(zoho.updateAccount).toHaveBeenCalledWith('test-token', 'z2', {
      Account_Name: 'Beta',
      PrintIQ_Customer_ID: '2',
    });
    expect(result).toEqual({ path: 'update', zohoId: 'z2' });
  });

  test('retries on 429 then succeeds (update path)', async () => {
    const job = { data: { printiqCustomerId: 3, name: 'Gamma' } };

    zoho.searchAccountByExternalId.mockResolvedValueOnce({ id: 'z3' });

    const rateLimitErr = new Error('rate limited');
    rateLimitErr.response = { status: 429 };
    zoho.updateAccount
      .mockRejectedValueOnce(rateLimitErr)
      .mockResolvedValueOnce({ success: true });

    const result = await processor(job);

    expect(zoho.searchAccountByExternalId).toHaveBeenCalledWith(
      'test-token',
      3
    );
    expect(zoho.updateAccount).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ path: 'update', zohoId: 'z3' });
  });

  test('discards on NonRetryableError', async () => {
    const err = makeNonRetryableError('bad');

    zoho.searchAccountByExternalId.mockRejectedValueOnce(err);

    const job = {
      data: { printiqCustomerId: 4, name: 'Delta' },
      discard: vi.fn(),
    };

    await expect(processor(job)).rejects.toBe(err);
    expect(job.discard).toHaveBeenCalled();
  });
});
