import { describe, it, expect, vi } from 'vitest';

vi.mock('ioredis', () => ({
  default: class {
    constructor() {}
  },
}));

vi.mock('bullmq', () => {
  class Worker {
    constructor(name, proc, opts) {
      this.name = name;
      this.proc = proc;
      this.opts = opts;
    }
    on() {}
  }
  class Queue {}
  return { Worker, Queue };
});

vi.mock('../../../sync/clients/zohoClient.js', () => ({
  createOrUpdateCustomer: vi.fn(),
}));
vi.mock('../../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));

import { processor, backoffStrategy } from '../../../src/workers/zohoWorker.js';
import { createOrUpdateCustomer } from '../../../sync/clients/zohoClient.js';

describe('zohoWorker processor', () => {
  it('retries and succeeds eventually', async () => {
    createOrUpdateCustomer
      .mockImplementationOnce(() => {
        throw new Error('fail1');
      })
      .mockImplementationOnce(() => {
        throw new Error('fail2');
      })
      .mockResolvedValueOnce({});

    const job = {
      data: { requestId: 'r1', payload: { ID: '1', Name: 'A' } },
      id: '1',
      attemptsMade: 0,
    };

    await expect(processor(job)).rejects.toThrow('fail1');
    job.attemptsMade++;
    await expect(processor(job)).rejects.toThrow('fail2');
    job.attemptsMade++;
    await expect(processor(job)).resolves.toBeUndefined();
    expect(createOrUpdateCustomer).toHaveBeenCalledTimes(3);
  });

  it('backoffStrategy grows', () => {
    const d1 = backoffStrategy(0);
    const d2 = backoffStrategy(1);
    expect(d2).toBeGreaterThan(d1);
  });
});
