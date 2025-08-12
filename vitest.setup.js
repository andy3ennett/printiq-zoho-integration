// vitest.setup.js
// Ensure a consistent global NonRetryableError class for tests
(function ensureGlobalNonRetryable() {
  const g = typeof globalThis !== 'undefined' ? globalThis : global;
  if (!g.NonRetryableError) {
    class NonRetryableError extends Error {
      constructor(message) {
        super(message);
        this.name = 'NonRetryableError';
        this.nonRetryable = true; // also marked by flag for looser checks
      }
    }
    g.NonRetryableError = NonRetryableError;
  }
})();

// Provide a stable async token helper some tests rely on
(function ensureGetValidAccessToken() {
  const g = typeof globalThis !== 'undefined' ? globalThis : global;
  if (!g.getValidAccessToken) {
    g.getValidAccessToken = async () => {
      try {
        const mod = await import('./sync/auth/tokenManager.js');
        const fn = mod.getAccessToken || mod?.default?.getAccessToken;
        const val = typeof fn === 'function' ? await fn() : undefined;
        return val ?? 'test-token';
      } catch {
        return 'test-token';
      }
    };
  }
})();

// Normalize the base URL used by Zoho client during tests to match nock expectations
if (!process.env.ZOHO_BASE_URL) {
  process.env.ZOHO_BASE_URL = 'https://www.zohoapis.com';
}

export {};
