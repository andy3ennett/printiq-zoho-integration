import { describe, it, expect, vi } from 'vitest';
import { setIfNotExists } from '../../../src/services/idempotency.js';

describe('idempotency', () => {
  it('sets key when absent', async () => {
    const client = { set: vi.fn().mockResolvedValue('OK') };
    const ok = await setIfNotExists('k', 10, client);
    expect(ok).toBe(true);
    expect(client.set).toHaveBeenCalledWith('k', '1', 'EX', 10, 'NX');
  });

  it('returns false when key exists', async () => {
    const client = { set: vi.fn().mockResolvedValue(null) };
    const ok = await setIfNotExists('k', 10, client);
    expect(ok).toBe(false);
  });
});
