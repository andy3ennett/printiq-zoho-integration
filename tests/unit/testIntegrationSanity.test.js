import { describe, it, expect, beforeAll, vi } from 'vitest';
vi.mock('../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));
vi.mock('../../sync/clients/zohoClient.js', () => ({
  createOrUpdateCustomer: vi.fn().mockResolvedValue({}),
  createOrUpdateContact: vi.fn().mockResolvedValue({}),
  createOrUpdateAddress: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../src/queues/zohoQueue.js', () => ({
  addZohoJob: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../src/services/idempotency.js', () => ({
  setIfNotExists: vi.fn().mockResolvedValue(true),
  buildKey: vi.fn(() => 'key'),
  hashPayload: vi.fn(() => 'hash'),
}));
import { getValidAccessToken } from '../../sync/auth/tokenManager.js';
import { processPrintIQCustomerWebhook } from '../../sync/handlers/processPrintIQCustomerWebhook.js';
import { processPrintIQContactWebhook } from '../../sync/handlers/processPrintIQContactWebhook.js';
import { processPrintIQAddressWebhook } from '../../sync/handlers/processPrintIQAddressWebhook.js';

const sampleCustomer = {
  ID: 999,
  Name: 'Test Co.',
  Phone: '1234567890',
  Website: 'https://test.co',
  Code: 'TEST123',
  Email: 'info@test.co',
  Fax: '',
  Comment: 'Sample test customer',
  Active: 'Yes',
  AddressLine1: '123 Test St',
  City: 'Testville',
  State: 'TS',
  Postcode: '12345',
  Country: 'Testland',
};

const sampleContact = {
  ContactKey: 123,
  IntegrationID: 'TEST-CONT-999',
  FirstName: 'John',
  Surname: 'Smith',
  FullName: 'John Smith',
  Email: 'test@example.com',
  Phone: '07000000000',
  Mobile: '',
  CustomerID: 999,
  CustomerCode: 'TEST123',
  Title: 'Manager',
};

const sampleAddress = {
  PrintIQ_Customer_ID: 999,
  Address: {
    AddressKey: 321,
    AddressLine1: '456 Updated Street',
    AddressLine2: 'Floor 2',
    City: 'Updated City',
    State: 'Updatedonia',
    PostCode: 'UPD456',
    Country: 'Updateland',
  },
};

describe('Integration Handler Sanity Checks', () => {
  let token;

  beforeAll(async () => {
    token = await getValidAccessToken();
    expect(token).toBeTruthy();
  });

  it('should process sample customer without throwing', async () => {
    const req = { body: sampleCustomer, headers: {} };
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    await expect(
      processPrintIQCustomerWebhook(req, res)
    ).resolves.not.toThrow();
  });

  it('should process sample contact without throwing', async () => {
    await expect(
      processPrintIQContactWebhook(sampleContact)
    ).resolves.not.toThrow();
  });

  it('should process sample address without throwing', async () => {
    await expect(
      processPrintIQAddressWebhook(sampleAddress)
    ).resolves.not.toThrow();
  });
});
