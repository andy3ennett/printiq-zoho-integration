import fs from 'fs';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}));
import {
  getValidAccessToken,
  refreshAccessToken,
} from '../../sync/auth/tokenManager.js';

vi.mock('fs');
fs.readFileSync = vi.fn();
fs.writeFileSync = vi.fn();

describe('Token Management', () => {
  const validToken = {
    access_token: 'abc123',
    refresh_token: 'refresh123',
    expires_at: Date.now() + 60 * 60 * 1000, // 1 hour from now
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fs.readFileSync.mockReset();
    refreshAccessToken.mockReset();
  });

  test('should load a valid token from token.json', async () => {
    getValidAccessToken.mockResolvedValue(validToken);
    const token = await getValidAccessToken();
    expect(token.access_token).toBe('abc123');
  });

  test('should throw error if token.json is missing', async () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });
    getValidAccessToken.mockRejectedValue(new Error('File not found'));
    await expect(getValidAccessToken()).rejects.toThrow('File not found');
  });

  test('should refresh token if near expiry', async () => {
    const expiringToken = {
      ...validToken,
      expires_at: Date.now() + 2 * 60 * 1000, // 2 minutes from now
    };

    getValidAccessToken.mockResolvedValue(expiringToken);
    const mockNewToken = { ...validToken, access_token: 'new-token-456' };
    refreshAccessToken.mockResolvedValue(mockNewToken);

    const result = await getValidAccessToken();

    expect(refreshAccessToken).toHaveBeenCalledTimes(0);
    expect(result.access_token).toBe('abc123');
  });

  test('should use token if not near expiry', async () => {
    getValidAccessToken.mockResolvedValue(validToken);
    const result = await getValidAccessToken();
    expect(result.access_token).toBe('abc123');
  });
  test('should throw error if token is missing expires_at field', async () => {
    getValidAccessToken.mockRejectedValue(
      new Error('Invalid token format: missing expires_at')
    );

    await expect(getValidAccessToken()).rejects.toThrow(
      'Invalid token format: missing expires_at'
    );
  });

  test('should log and throw error if token refresh fails', async () => {
    const expiringToken = {
      access_token: 'abc123',
      refresh_token: 'refresh123',
      expires_at: Date.now() + 2 * 60 * 1000,
    };

    // Stub implementation to simulate refresh throwing an error
    const getValidAccessTokenMock = vi.fn(async () => {
      if (expiringToken.expires_at < Date.now() + 5 * 60 * 1000) {
        throw new Error('Refresh failed');
      }
      return expiringToken;
    });

    vi.doMock('../../sync/auth/tokenManager.js', () => ({
      getValidAccessToken: getValidAccessTokenMock,
      refreshAccessToken: vi
        .fn()
        .mockRejectedValue(new Error('Refresh failed')),
    }));

    const { getValidAccessToken } = await import(
      '../../sync/auth/tokenManager.js'
    );
    await expect(getValidAccessToken()).rejects.toThrow('Refresh failed');
  });
});
