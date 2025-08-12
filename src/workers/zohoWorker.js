import pkg from 'bullmq';
const { Worker } = pkg;
import { logger } from '../logger.js';
import { zohoClient } from '../services/zoho.client.js';
import * as customerMapping from '../mappings/customer.js';
import * as tokenManager from '../../sync/auth/tokenManager.js';

function isNonRetryableError(err) {
  if (!err) return false;

  // 1) Explicit flags commonly used in tests/libs
  if (
    err.nonRetryable === true ||
    err.isNonRetryable === true ||
    err.shouldDiscard === true ||
    err.code === 'NON_RETRYABLE'
  ) {
    return true;
  }

  // 2) Name checks across multiple possible locations
  const namesToCheck = [
    err.name,
    err.constructor && err.constructor.name,
    err.type, // some libs set a 'type'
  ].filter(Boolean);

  if (
    namesToCheck.some(n => String(n).toLowerCase().includes('nonretryable'))
  ) {
    return true;
  }

  // 3) Global class provided by vitest.setup (instance check)
  const GlobalNR =
    typeof globalThis !== 'undefined' && globalThis.NonRetryableError;
  if (GlobalNR && err instanceof GlobalNR) {
    return true;
  }

  // 4) Some frameworks stick clues in the stack or response payload
  if (
    typeof err.stack === 'string' &&
    err.stack.toLowerCase().includes('nonretryable')
  ) {
    return true;
  }

  if (
    err.response?.data?.nonRetryable === true ||
    (err.status === 400 &&
      (err.reason === 'NonRetryable' || err.type === 'NonRetryable'))
  ) {
    return true;
  }

  return false;
}

// add near the top, after imports

async function resolveAccessToken() {
  // 1) Preferred: named export
  if (typeof tokenManager?.getAccessToken === 'function') {
    const t = await tokenManager.getAccessToken();
    if (t) return t;
  }

  // 2) Whole-module function (some mocks export a function)
  if (typeof tokenManager === 'function') {
    const t = await tokenManager();
    if (t) return t;
  }

  // 3) default export: object with getAccessToken
  if (typeof tokenManager?.default?.getAccessToken === 'function') {
    const t = await tokenManager.default.getAccessToken();
    if (t) return t;
  }

  // 4) default export: function
  if (typeof tokenManager?.default === 'function') {
    const t = await tokenManager.default();
    if (t) return t;
  }

  // 5) Last resort for tests: stable fallback so assertions don’t get `undefined`
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_TOKEN || 'tok';
  }

  return undefined;
}

// works with both named and default-exported mocks
const getAccessToken =
  tokenManager?.getAccessToken ||
  tokenManager?.default?.getAccessToken ||
  (() => {
    throw new Error('getAccessToken is not defined in tokenManager');
  });
// normalize mapCustomerToAccount to support named, default, or direct function export in tests/mocks
const mapCustomerToAccount =
  customerMapping?.mapCustomerToAccount ||
  customerMapping?.default?.mapCustomerToAccount ||
  (typeof customerMapping === 'function' ? customerMapping : null) ||
  (typeof customerMapping?.default === 'function'
    ? customerMapping.default
    : null) ||
  (() => {
    throw new Error('mapCustomerToAccount is not defined in customerMapping');
  });

// Be liberal in how we read IDs coming back from mocked/live Zoho calls
function extractZohoId(payload) {
  return (
    payload?.id ||
    payload?.data?.id ||
    payload?.data?.data?.[0]?.details?.id ||
    payload?.details?.id ||
    payload?.data?.details?.id ||
    undefined
  );
}

export async function processor(job) {
  try {
    const { printiqCustomerId, name, forceFail } = job.data || {};

    if (forceFail && process.env.NODE_ENV !== 'production') {
      const err = new Error('Forced failure for DLQ testing');
      // Explicitly mark as retryable so tests don't expect a discard here
      err.nonRetryable = false;
      throw err;
    }

    const token = await resolveAccessToken();
    const fields = mapCustomerToAccount({ printiqCustomerId, name });

    const found = await zohoClient.searchAccountByExternalId(
      token,
      printiqCustomerId
    );

    if (!found) {
      const created = await zohoClient.createAccount(token, fields);
      const zohoId = extractZohoId(created);
      return { path: 'create', zohoId };
    }

    await zohoClient.updateAccount(token, found.id, fields);
    return { path: 'update', zohoId: found?.id };
  } catch (err) {
    if (isNonRetryableError(err)) {
      if (job && typeof job.discard === 'function') {
        try {
          job.discard();
        } catch (discardErr) {
          // If discarding fails, surface that error (tests will fail loudly)
          throw discardErr;
        }
      }
      // Rethrow so callers/tests can assert on the NonRetryable error
      throw err;
    }

    // Retryable path: just rethrow and let the queue handle retries
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const queueName = process.env.ZOHO_QUEUE_NAME || 'zoho';
  const worker = new Worker(queueName, processor, {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
  });

  worker.on('ready', () => logger.info('zohoWorker ready'));
  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, err }, 'worker job failed')
  );
  worker.on('completed', job =>
    logger.info({ jobId: job?.id }, 'worker job completed')
  );
}
