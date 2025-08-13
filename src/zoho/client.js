import axios from 'axios';
import { crmUrl } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class NonRetryableError extends Error {}
export class RetryableError extends Error {}
export class RateLimitError extends RetryableError {}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const MAX_RETRIES = 3;

async function request(method, path, token, { params, data } = {}) {
  const url = crmUrl(path);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();
    try {
      const res = await axios({
        method,
        url,
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params,
        data,
      });
      const duration = Date.now() - start;
      logger.info(
        { method, path, attempt, status: res.status, duration },
        'zoho request success'
      );
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const duration = Date.now() - start;
      logger.warn(
        { method, path, attempt, status, duration },
        'zoho request error'
      );
      const shouldRetry = status === 429 || (status >= 500 && status < 600);
      if (shouldRetry && attempt < MAX_RETRIES) {
        const delay = 500 * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }
      if (status === 429) throw new RateLimitError(err.message);
      if (status >= 500 && status < 600) throw new RetryableError(err.message);
      throw new NonRetryableError(err.message);
    }
  }
}

export async function getCurrentUser(token) {
  const res = await request('get', '/users', token, {
    params: { type: 'CurrentUser' },
  });
  return res?.users?.[0] || null;
}

export async function searchAccountsByExternalId(token, externalId) {
  const criteria = `(PrintIQ_Customer_ID:equals:${externalId})`;
  const res = await request('get', '/Accounts/search', token, {
    params: { criteria },
  });
  return res?.data?.[0] || null;
}

export async function createAccount(token, body) {
  const res = await request('post', '/Accounts', token, {
    data: { data: [body] },
  });
  return res?.data?.[0];
}

export async function updateAccount(token, id, body) {
  const res = await request('put', `/Accounts/${id}`, token, {
    data: { data: [body] },
  });
  return res?.data?.[0];
}
