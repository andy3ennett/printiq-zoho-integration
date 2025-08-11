import { describe, it, expect } from 'vitest';
import { setIfNotExists } from '../../src/services/idempotency.js';

class FakeRedis {
  constructor() {
    this.store = new Map();
  }
  async set(key, val, mode1, ttl, mode2) {
    if (!(mode1 === 'EX' && typeof ttl === 'number' && mode2 === 'NX')) {
      throw new Error('Incorrect Redis SET options');
    }
    if (this.store.has(key)) return null;
    this.store.set(key, { val, ttl });
    return 'OK';
  }
}

describe('idempotency.setIfNotExists', () => {
  it('returns true the first time and false on duplicates within TTL', async () => {
    const client = new FakeRedis();
    const key = 'printiq:customer.updated:evt_1';
    const first = await setIfNotExists(key, 1800, client);
    const second = await setIfNotExists(key, 1800, client);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
