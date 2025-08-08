import { describe, test, expect, vi } from 'vitest';
vi.mock('../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));
vi.mock('axios', () => ({
  default: {
    get: vi
      .fn()
      .mockResolvedValue({ data: { data: [{ id: '1', Customer_ID: 999 }] } }),
  },
}));
import { getValidAccessToken } from '../../sync/auth/tokenManager.js';
import { findZohoAccountByPrintIQId } from '../../sync/helpers/zohoApi.js';

describe('Zoho Account Search', () => {
  test('should find a Zoho account by PrintIQ customer ID', async () => {
    const testCustomerID = 999;

    const token = await getValidAccessToken();
    const account = await findZohoAccountByPrintIQId(testCustomerID, token);

    expect(account).toBeDefined();
    if (account) {
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('Customer_ID');
    }
  });
});
