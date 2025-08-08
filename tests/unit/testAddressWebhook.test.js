import { describe, test, expect, vi } from 'vitest';
vi.mock('../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));
vi.mock('../../sync/clients/zohoClient.js', () => ({
  createOrUpdateAddress: vi.fn().mockResolvedValue({}),
}));
import { processPrintIQAddressWebhook } from '../../sync/handlers/processPrintIQAddressWebhook.js';

describe('processPrintIQAddressWebhook', () => {
  test('should process address webhook successfully', async () => {
    const testPayload = {
      PrintIQ_Customer_ID: 14357,
      Address: {
        AddressKey: 47109,
        AddressLine1: '456 Updated Street',
        AddressLine2: 'Floor 2',
        City: 'Updated City',
        State: 'Updatedonia',
        PostCode: 'UPD456',
        Country: 'Updateland',
      },
    };

    await expect(
      processPrintIQAddressWebhook(testPayload)
    ).resolves.not.toThrow();
  });
});
