// __mocks__/sync/auth/tokenManager.js
// ESM-compatible manual mock that matches the real module's named exports.

process.env.ZOHO_BASE_URL = 'https://www.zohoapis.com';

export const getAccessToken = vi.fn(async () => 'test-token');

export async function saveAccessToken() {
  // no-op in tests
}

export async function getRefreshToken() {
  return 'mock-refresh-token';
}

export async function tokenDoctor() {
  return { ok: true, reason: null };
}

export default {
  getAccessToken,
  saveAccessToken,
  getRefreshToken,
  tokenDoctor,
};
