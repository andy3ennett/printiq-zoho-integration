import { describe, it, expect, vi } from 'vitest';

vi.mock('ioredis', () => ({
  default: class {
    constructor() {}
  },
}));

vi.mock('bullmq', () => {
  return {
    Queue: class {
      constructor(name, opts) {
        this.opts = opts;
      }
      add(name, data, opts = {}) {
        return Promise.resolve({
          opts: { ...this.opts.defaultJobOptions, ...opts },
        });
      }
    },
  };
});

import { zohoQueue } from '../../../src/queues/zohoQueue.js';

describe('zohoQueue', () => {
  it('applies retry and backoff options', async () => {
    const job = await zohoQueue.add('customer.upsert', {});
    expect(job.opts.attempts).toBe(5);
    expect(job.opts.backoff).toEqual({ type: 'custom' });
  });
});
