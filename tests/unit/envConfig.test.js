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
    const { env, zohoUrl, zohoAccountsUrl, crmUrl } = await import(
      '../../src/config/env.js'
    );
    expect(env.ZOHO_BASE_URL).toBe('https://www.zohoapis.com');
    expect(env.ZOHO_ACCOUNTS_URL).toBe('https://accounts.zoho.com');
    expect(zohoUrl('/foo')).toBe('https://www.zohoapis.com/foo');
    expect(crmUrl('/bar')).toBe('https://www.zohoapis.com/crm/v3/bar');
    expect(zohoAccountsUrl('/baz')).toBe('https://accounts.zoho.com/baz');
  });

  it('builds URLs from env vars', async () => {
    process.env.ZOHO_BASE_URL = 'https://api.example.com';
    process.env.ZOHO_ACCOUNTS_URL = 'https://accounts.example.com';
    const { crmUrl, zohoAccountsUrl } = await import('../../src/config/env.js');
    expect(crmUrl('/abc')).toBe('https://api.example.com/crm/v3/abc');
    expect(zohoAccountsUrl('/def')).toBe('https://accounts.example.com/def');
  });
});
