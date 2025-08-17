import { describe, it, expect, vi } from 'vitest';

process.env.ENABLE_METRICS = 'true';

const { loggerInfo, observeJobDuration } = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  observeJobDuration: vi.fn(),
}));

vi.mock('../../sync/auth/tokenManager.js', () => ({
  __esModule: true,
  getAccessToken: vi.fn().mockResolvedValue('test-token'),
  default: { getAccessToken: vi.fn().mockResolvedValue('test-token') },
}));

vi.mock('../../src/services/zoho.client.js', () => ({
  __esModule: true,
  searchAccountByExternalId: vi.fn().mockResolvedValue(null),
  createAccount: vi.fn().mockResolvedValue({ id: 'z1' }),
  updateAccount: vi.fn(),
}));

vi.mock('../../src/mappings/customer.js', () => ({
  __esModule: true,
  mapCustomerToAccount: vi.fn(() => ({
    Account_Name: 'Acme',
    PrintIQ_Customer_ID: '1',
  })),
}));

vi.mock('../../src/logger.js', () => ({
  __esModule: true,
  logger: { info: loggerInfo },
}));

vi.mock('../../src/middleware/metrics.js', () => ({
  __esModule: true,
  observeJobDuration,
  startTimer: () => () => 0.5,
}));

import { processor } from '../../src/workers/zohoWorker.js';

describe('worker metrics', () => {
  it('records processing duration', async () => {
    await processor({ id: 'j1', data: { printiqCustomerId: 1, name: 'Acme' } });
    expect(observeJobDuration).toHaveBeenCalledWith(0.5);
    expect(loggerInfo).toHaveBeenCalledWith(
      { jobId: 'j1', duration: 0.5 },
      'worker job processed'
    );
  });
});
