import { describe, it, expect, vi } from 'vitest';

vi.mock('ioredis', () => ({
  default: class {
    constructor() {}
  },
}));

vi.mock('bullmq', () => {
  let processor;
  const listeners = {};
  class Queue {
    add(name, data) {
      const job = { id: '1', name, data, attemptsMade: 0 };
      if (processor) {
        Promise.resolve(processor(job)).then(
          () => listeners.completed && listeners.completed(job)
        );
      }
      return Promise.resolve(job);
    }
  }
  class Worker {
    constructor(name, proc) {
      processor = proc;
    }
    on(event, cb) {
      listeners[event] = cb;
    }
    close() {
      return Promise.resolve();
    }
  }
  return { Queue, Worker };
});

vi.mock('../../sync/clients/zohoClient.js', () => ({
  createOrUpdateCustomer: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));

import { zohoQueue } from '../../src/queues/zohoQueue.js';
import { worker } from '../../src/workers/zohoWorker.js';
import { createOrUpdateCustomer } from '../../sync/clients/zohoClient.js';

describe('bullmq integration', () => {
  it('processes a job end-to-end', async () => {
    const done = new Promise(resolve => {
      worker.on('completed', resolve);
    });
    await zohoQueue.add('customer.upsert', {
      requestId: 'r1',
      payload: { ID: '1', Name: 'Acme' },
    });
    await done;
    expect(createOrUpdateCustomer).toHaveBeenCalledTimes(1);
  });
});
