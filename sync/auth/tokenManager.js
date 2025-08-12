// sync/auth/tokenManager.js
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../src/logger.js';

const TOKEN_FILE = path.resolve(process.env.TOKEN_FILE || './token.json');

export async function getAccessToken() {
  const data = await fs.readFile(TOKEN_FILE, 'utf8');
  const { access_token } = JSON.parse(data);
  return access_token;
}

export const getValidAccessToken = getAccessToken;
export const getAccessTokenAlias = (...args) => getValidAccessToken(...args);

export async function saveAccessToken(access_token, refresh_token) {
  await fs.writeFile(
    TOKEN_FILE,
    JSON.stringify({ access_token, refresh_token }),
    'utf8'
  );
  logger.info('Access token saved');
}

export async function getRefreshToken() {
  const data = await fs.readFile(TOKEN_FILE, 'utf8');
  const { refresh_token } = JSON.parse(data);
  return refresh_token;
}

export async function tokenDoctor() {
  try {
    const data = await fs.readFile(TOKEN_FILE, 'utf8');
    const parsed = JSON.parse(data || '{}');

    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, reason: 'token file is not valid JSON' };
    }

    if (!parsed.access_token) {
      return { ok: false, reason: 'missing access_token' };
    }

    if (!parsed.refresh_token) {
      return { ok: false, reason: 'missing refresh_token' };
    }

    return { ok: true, reason: null };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { ok: false, reason: 'token file not found' };
    }
    return { ok: false, reason: 'unable to read token file' };
  }
}
