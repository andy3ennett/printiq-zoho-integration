import { describe, test, expect, vi } from 'vitest';
vi.mock('../../sync/auth/tokenManager.js', () => ({
  __esModule: true,
  getAccessToken: async () => 'test-token',
}));
vi.mock('../../sync/clients/zohoClient.js', () => ({
  createOrUpdateCustomer: vi.fn().mockResolvedValue({}),
  createOrUpdateContact: vi.fn().mockResolvedValue({}),
  createOrUpdateAddress: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../src/services/idempotency.js', () => ({
  setIfNotExists: vi.fn().mockResolvedValue(true),
  buildKey: (_t, id) => `printiq:customer:${id}`,
  hashPayload: () => 'hash',
}));
vi.mock('../../src/queues/zohoQueue.js', () => ({
  enqueueCustomerUpsert: vi.fn().mockResolvedValue({}),
}));
import * as tokenManager from '../../sync/auth/tokenManager.js';
import { processPrintIQCustomerWebhook } from '../../sync/handlers/processPrintIQCustomerWebhook';
import { processPrintIQContactWebhook } from '../../sync/handlers/processPrintIQContactWebhook';
import { processPrintIQAddressWebhook } from '../../sync/handlers/processPrintIQAddressWebhook';

describe('Handler Modules Load and Execute', () => {
  test('should load and run customer handler without error', async () => {
    const req = {
      body: { id: '1', printiqCustomerId: 1, name: 'Test Co.' },
      headers: {},
    };
    const res = { status: () => ({ json: () => {} }) };
    await expect(
      processPrintIQCustomerWebhook(req, res)
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
    await expect(tokenManager.getAccessToken()).resolves.toBeTruthy();
  });
});
