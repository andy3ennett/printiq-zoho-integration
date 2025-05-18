import fs from 'fs';
import path from 'path';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../sync/auth/tokenManager.js');
import {
  getValidAccessToken,
  refreshAccessToken,
} from '../../sync/auth/tokenManager.js';

vi.mock('fs');
fs.readFileSync = vi.fn();
fs.writeFileSync = vi.fn();

describe('Token Management', () => {
  const tokenPath = path.resolve('token.json');
  const validToken = {
    access_token: 'abc123',
    refresh_token: 'refresh123',
    expires_at: Date.now() + 60 * 60 * 1000, // 1 hour from now
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('should load a valid token from token.json', () => {
    getValidAccessToken.mockReturnValue(validToken);
    fs.readFileSync.mockReturnValue(JSON.stringify(validToken));
    const token = getValidAccessToken();
    expect(token.access_token).toBe('abc123');
    expect(fs.readFileSync).toHaveBeenCalledWith(tokenPath, 'utf8');
  });

  test('should throw error if token.json is missing', () => {
    getValidAccessToken.mockImplementation(() => {
      throw new Error('File not found');
    });
    fs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });
    expect(() => getValidAccessToken()).toThrow('File not found');
  });

  test('should refresh token if near expiry', async () => {
    const expiringToken = {
      ...validToken,
      expires_at: Date.now() + 2 * 60 * 1000, // 2 minutes from now
    };

    fs.readFileSync.mockReturnValue(JSON.stringify(expiringToken));
    const mockNewToken = { ...validToken, access_token: 'new-token-456' };
    refreshAccessToken.mockResolvedValue(mockNewToken);

    const result = await getValidAccessToken();

    expect(refreshAccessToken).toHaveBeenCalled();
    expect(result.access_token).toBe('new-token-456');
  });

  test('should use token if not near expiry', async () => {
    getValidAccessToken.mockResolvedValue(validToken);
    fs.readFileSync.mockReturnValue(JSON.stringify(validToken));
    const result = await getValidAccessToken();
    expect(result.access_token).toBe('abc123');
  });
  test('should throw error if token is missing expires_at field', async () => {
    const malformedToken = {
      access_token: 'abc123',
      refresh_token: 'refresh123',
      // expires_at is missing
    };
    getValidAccessToken.mockImplementation(() => {
      throw new Error('Invalid token format: missing expires_at');
    });
    fs.readFileSync.mockReturnValue(JSON.stringify(malformedToken));

    await expect(getValidAccessToken()).rejects.toThrow(
      'Invalid token format: missing expires_at'
    );
  });

  test('should log and throw error if token refresh fails', async () => {
    getValidAccessToken.mockImplementation(() => {
      throw new Error('Refresh failed');
    });
    const expiringToken = {
      ...validToken,
      expires_at: Date.now() + 2 * 60 * 1000, // 2 minutes from now
    };

    fs.readFileSync.mockReturnValue(JSON.stringify(expiringToken));
    refreshAccessToken.mockRejectedValue(new Error('Refresh failed'));

    await expect(getValidAccessToken()).rejects.toThrow('Refresh failed');
    expect(refreshAccessToken).toHaveBeenCalled();
  });
});
