// tests/integration/customerUpsert.e2e.test.js

vi.mock('../../src/services/zoho.client.js', () => {
  return {
    searchAccountByExternalId: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
  };
});

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

    // First Zoho call rejects with NonRetryableError
    zoho.searchAccountByExternalId.mockRejectedValueOnce(err);

    const job = {
      data: { printiqCustomerId: 1, name: 'Acme' },
      discard: vi.fn(),
    };

    await expect(processor(job)).rejects.toBe(err);
    expect(job.discard).toHaveBeenCalled();
  });
});
