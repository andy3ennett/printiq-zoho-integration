// tests/integration/customerUpsert.e2e.test.js

import { vi, describe, beforeEach, test, expect } from 'vitest';

// --- Mock Zoho client: export named functions, not { zohoClient } ---
vi.mock('../../src/services/zoho.client.js', () => ({
  searchAccountByExternalId: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

// If this test relies on the token mock, make sure it’s mocked too:
vi.mock('../../sync/auth/tokenManager.js'); // uses __mocks__/sync/auth/tokenManager.js

// Now import AFTER mocks
import * as zoho from '../../src/services/zoho.client.js';
import { processor } from '../../src/workers/zohoWorker.js';

describe('customer upsert processor e2e', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('discards on NonRetryableError', async () => {
    const err = new (globalThis.NonRetryableError ?? Error)('bad');
    err.name = 'NonRetryableError';
    err.nonRetryable = true;

    zoho.searchAccountByExternalId.mockRejectedValueOnce(err);

    const job = {
      data: { printiqCustomerId: 1, name: 'Acme' },
      discard: vi.fn(),
    };

    await expect(processor(job)).rejects.toBe(err);
    expect(job.discard).toHaveBeenCalled();
  });
});
// tests/integration/customerUpsert.e2e.test.js

// --- Mocks must be defined BEFORE imports that use them ---
// Mock Zoho client as named exports (no wrapper object)
vi.mock('../../src/services/zoho.client.js', () => ({
  searchAccountByExternalId: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

// Mock token manager to provide a deterministic token for all tests
vi.mock('../../sync/auth/tokenManager.js', () => ({
  getAccessToken: vi.fn().mockResolvedValue('test-token'),
  getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
}));

// Mock mapping to ensure stable field shapes used by the worker
vi.mock('../../src/mappings/customer.js', () => ({
  mapCustomerToAccount: vi.fn(({ printiqCustomerId, name }) => ({
    Account_Name: name,
    PrintIQ_Customer_ID: String(printiqCustomerId),
  })),
}));

// Now import AFTER mocks so the worker sees the mocked modules
import { mapCustomerToAccount } from '../../src/mappings/customer.js';

// Helper to build a NonRetryable error compatible with zohoWorker checks
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
    // Arrange
    const job = { data: { printiqCustomerId: 1, name: 'Acme' } };

    // search returns not found
    zoho.searchAccountByExternalId.mockResolvedValueOnce(null);

    // create returns a payload from which the worker can extract the id
    const createdPayload = { id: 'z1', data: [{ details: { id: 'z1' } }] };
    zoho.createAccount.mockResolvedValueOnce(createdPayload);

    // Act
    const result = await processor(job);

    // Assert
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
    // Arrange
    const job = { data: { printiqCustomerId: 2, name: 'Beta' } };

    zoho.searchAccountByExternalId.mockResolvedValueOnce({ id: 'z2' });
    zoho.updateAccount.mockResolvedValueOnce({ success: true });

    // Act
    const result = await processor(job);

    // Assert
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
    // Arrange
    const job = { data: { printiqCustomerId: 3, name: 'Gamma' } };

    zoho.searchAccountByExternalId.mockResolvedValueOnce({ id: 'z3' });

    const rateLimitErr = new Error('rate limited');
    rateLimitErr.response = { status: 429 };
    zoho.updateAccount
      .mockRejectedValueOnce(rateLimitErr) // first attempt 429
      .mockResolvedValueOnce({ success: true }); // second attempt success

    // Act
    const result = await processor(job);

    // Assert
    expect(zoho.searchAccountByExternalId).toHaveBeenCalledWith(
      'test-token',
      3
    );
    expect(zoho.updateAccount).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ path: 'update', zohoId: 'z3' });
  });

  test('discards on NonRetryableError', async () => {
    // Arrange
    const err = makeNonRetryableError('bad');

    // Force the first operation to throw a non-retryable error
    zoho.searchAccountByExternalId.mockRejectedValueOnce(err);

    const job = {
      data: { printiqCustomerId: 4, name: 'Delta' },
      discard: vi.fn(),
    };

    // Act + Assert
    await expect(processor(job)).rejects.toBe(err);
    expect(job.discard).toHaveBeenCalled();
  });
});
