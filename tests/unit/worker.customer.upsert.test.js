import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('tok'),
}));

const searchMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
vi.mock('../../src/zoho/client.js', () => {
  class NonRetryableError extends Error {}
  return {
    searchAccountsByExternalId: (...a) => searchMock(...a),
    createAccount: (...a) => createMock(...a),
    updateAccount: (...a) => updateMock(...a),
    NonRetryableError,
  };
});

const mapMock = vi.fn(p => ({
  Account_Name: p.name,
  PrintIQ_Customer_ID: String(p.printiqCustomerId),
}));
vi.mock('../../src/mappings/customer.js', () => ({
  toZohoAccount: (...a) => mapMock(...a),
}));

import { processor } from '../../src/workers/zohoWorker.js';

describe('worker customer.upsert', () => {
  beforeEach(() => {
    searchMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    mapMock.mockClear();
  });

  it('creates account when not found', async () => {
    searchMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ details: { id: 'z1' } });
    const job = {
      id: '1',
      data: { requestId: 'r', printiqCustomerId: 1, name: 'Acme' },
    };
    const res = await processor(job);
    expect(createMock).toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(res).toEqual({ zohoId: 'z1', path: 'create' });
  });

  it('updates when account exists', async () => {
    searchMock.mockResolvedValue({ id: 'z2' });
    const job = {
      id: '2',
      data: { requestId: 'r', printiqCustomerId: 2, name: 'Beta' },
    };
    const res = await processor(job);
    expect(updateMock).toHaveBeenCalledWith('tok', 'z2', {
      Account_Name: 'Beta',
      PrintIQ_Customer_ID: '2',
    });
    expect(res.path).toBe('update');
  });

  it('discards on NonRetryableError', async () => {
    const { NonRetryableError } = await import('../../src/zoho/client.js');
    const err = new NonRetryableError('bad');
    searchMock.mockRejectedValue(err);
    const job = {
      id: '3',
      data: { requestId: 'r', printiqCustomerId: 3, name: 'Gamma' },
      discard: vi.fn(),
    };
    await expect(processor(job)).rejects.toBe(err);
    expect(job.discard).toHaveBeenCalled();
  });
});
