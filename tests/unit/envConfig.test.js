import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe('env config helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it('provides default URLs', async () => {
    delete process.env.ZOHO_BASE_URL;
    delete process.env.ZOHO_ACCOUNTS_URL;
    const { env, zohoUrl, zohoAccountsUrl } = await import(
      '../../src/config/env.js'
    );
    expect(env.ZOHO_BASE_URL).toBe('https://www.zohoapis.com/crm/v2');
    expect(env.ZOHO_ACCOUNTS_URL).toBe('https://accounts.zoho.com');
    expect(zohoUrl('/foo')).toBe('https://www.zohoapis.com/crm/v2/foo');
    expect(zohoAccountsUrl('/bar')).toBe('https://accounts.zoho.com/bar');
  });

  it('builds URLs from env vars', async () => {
    process.env.ZOHO_BASE_URL = 'https://api.example.com/crm/v2';
    process.env.ZOHO_ACCOUNTS_URL = 'https://accounts.example.com';
    const { zohoUrl, zohoAccountsUrl } = await import(
      '../../src/config/env.js'
    );
    expect(zohoUrl('/abc')).toBe('https://api.example.com/crm/v2/abc');
    expect(zohoAccountsUrl('/def')).toBe('https://accounts.example.com/def');
  });
});
