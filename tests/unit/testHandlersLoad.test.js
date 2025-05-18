import { describe, test, expect } from 'vitest';
import { processPrintIQCustomerWebhook } from '../../sync/handlers/processPrintIQCustomerWebhook';
import { processPrintIQContactWebhook } from '../../sync/handlers/processPrintIQContactWebhook';
import { processPrintIQAddressWebhook } from '../../sync/handlers/processPrintIQAddressWebhook';
import { getValidAccessToken } from '../../sync/auth/tokenManager';

describe('Handler Modules Load and Execute', () => {
  test('should load and run customer handler without error', async () => {
    await expect(
      processPrintIQCustomerWebhook({ ID: 1, Name: 'Test Co.' })
    ).resolves.not.toThrow();
  });

  test('should load and run contact handler without error', async () => {
    await expect(
      processPrintIQContactWebhook({
        FullName: 'John Smith',
        Email: 'test@example.com',
      })
    ).resolves.not.toThrow();
  });

  test('should load and run address handler without error', async () => {
    await expect(
      processPrintIQAddressWebhook({
        PrintIQ_Customer_ID: 1,
        Address: { AddressKey: 123 },
      })
    ).resolves.not.toThrow();
  });

  test('should retrieve valid access token', async () => {
    await expect(getValidAccessToken()).resolves.not.toThrow();
  });
});
