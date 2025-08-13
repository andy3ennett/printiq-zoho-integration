// __mocks__/sync/auth/tokenManager.js
async function _getAccessToken() {
  return 'test-token';
}

export async function getAccessToken() {
  return _getAccessToken();
}

const defaultExport = { getAccessToken };
export default defaultExport;
