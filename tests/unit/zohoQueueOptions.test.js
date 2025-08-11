import { describe, it, expect } from 'vitest';
import { zohoQueue } from '../../src/queues/zohoQueue.js';

describe('zohoQueue defaults', () => {
  it('configures retry and cleanup options', () => {
    expect(zohoQueue.opts.defaultJobOptions).toMatchObject({
      attempts: 5,
      backoff: { type: 'custom' },
      removeOnComplete: 100,
      removeOnFail: false,
    });
  });
});
