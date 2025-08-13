import { describe, it, expect, vi } from 'vitest';

const addSpy = vi.fn(async () => ({ id: 'job-1' }));

vi.mock('bullmq', () => {
  // Our code imports default then destructures: `import pkg from 'bullmq'; const { Queue } = pkg;`
  class MockQueue {
    constructor() {}
    add(name, data, opts) {
      return addSpy(name, data, opts);
    }
  }
  return { default: { Queue: MockQueue } };
});

import { enqueueCustomerUpsert } from '../../src/queues/zohoQueue.js';

describe('zohoQueue enqueue options', () => {
  it('uses attempts=5 and exponential backoff', async () => {
    await enqueueCustomerUpsert({ printiqCustomerId: 999 });

    expect(addSpy).toHaveBeenCalledTimes(1);
    const [name, data, opts] = addSpy.mock.calls[0];

    expect(name).toBe('customer.upsert');
    expect(data.printiqCustomerId).toBe(999);
    expect(opts.attempts).toBe(5);
    expect(opts.backoff).toMatchObject({ type: 'exponential', delay: 500 });
    expect(opts.removeOnComplete).toBeDefined();
  });
});
