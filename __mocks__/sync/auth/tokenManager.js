// __mocks__/sync/auth/tokenManager.js
// ESM-compatible manual mock that matches the real module's named exports.

process.env.ZOHO_BASE_URL = 'https://www.zohoapis.com';

export async function getAccessToken() {
  return process.env.TEST_TOKEN || 'tok';
}

export async function getValidAccessToken() {
  return process.env.TEST_TOKEN || 'tok';
}

export async function saveAccessToken() {
  // no-op in tests
}

export async function getRefreshToken() {
  return 'mock-refresh-token';
}

export async function tokenDoctor() {
  return { ok: true, reason: null };
}

// Optional default export in case anything imports default
export default {
  getAccessToken,
  getValidAccessToken,
  saveAccessToken,
  getRefreshToken,
  tokenDoctor,
};
