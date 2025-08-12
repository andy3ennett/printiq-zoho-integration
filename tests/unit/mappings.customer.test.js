import { describe, it, expect } from 'vitest';
import { toZohoAccount } from '../../src/mappings/customer.js';

describe('customer mapping', () => {
  it('maps to Zoho Account shape', () => {
    const result = toZohoAccount({ printiqCustomerId: 42, name: 'Acme' });
    expect(result).toEqual({
      Account_Name: 'Acme',
      PrintIQ_Customer_ID: '42',
    });
  });
});
