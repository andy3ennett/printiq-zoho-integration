import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub ioredis used inside src/services/idempotency.js so tests run without a real Redis
vi.mock('ioredis', () => {
  class FakeRedis {
    constructor() {
      this.store = new Map();
    }
    async set(key, val, mode1, ttl, mode2) {
      // Expect: SET key "1" EX ttl NX
      if (!(mode1 === 'EX' && typeof ttl === 'number' && mode2 === 'NX')) {
        throw new Error('Incorrect Redis SET options');
      }
      if (this.store.has(key)) return null; // not set (duplicate)
      this.store.set(key, { val, exp: ttl });
      return 'OK';
    }
  }
  return { default: FakeRedis };
});

import { setOnce } from '../../src/services/idempotency.js';

describe('idempotency.setOnce', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns true the first time and false on duplicates within TTL', async () => {
    const key = 'printiq:customer.updated:evt_1';
    const first = await setOnce(key, 1800);
    const second = await setOnce(key, 1800);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
