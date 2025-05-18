import { describe, test, expect, vi, beforeEach } from 'vitest';
import { processPrintIQAddressWebhook } from '../../sync/handlers/processPrintIQAddressWebhook.js';
import * as tokenManager from '../../sync/auth/tokenManager.js';

describe('processPrintIQAddressWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should process address webhook successfully', async () => {
    vi.spyOn(tokenManager, 'refreshAccessToken').mockResolvedValue();

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
