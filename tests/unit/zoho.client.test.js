import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('axios', () => ({ default: vi.fn() }));
import axios from 'axios';
import {
  searchAccountsByExternalId,
  RetryableError,
  NonRetryableError,
  RateLimitError,
} from '../../src/zoho/client.js';

const token = 't';

describe('zoho client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('retries on 429 with backoff', async () => {
    axios
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValue({ status: 200, data: { data: [] } });

    const promise = searchAccountsByExternalId(token, '1');
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res).toBeNull();
    expect(axios).toHaveBeenCalledTimes(3);
  });

  it('throws RateLimitError after repeated 429s', async () => {
    axios.mockRejectedValue({ response: { status: 429 } });
    const p = searchAccountsByExternalId(token, '1');
    const expectation = expect(p).rejects.toBeInstanceOf(RateLimitError);
    await vi.runAllTimersAsync();
    await expectation;
    expect(axios).toHaveBeenCalledTimes(3);
  });

  it('throws RetryableError after 5xx attempts', async () => {
    axios.mockRejectedValue({ response: { status: 500 } });
    const p = searchAccountsByExternalId(token, '1');
    const expectation = expect(p).rejects.toBeInstanceOf(RetryableError);
    await vi.runAllTimersAsync();
    await expectation;
    expect(axios).toHaveBeenCalledTimes(3);
  });

  it('retries on 500 with backoff and succeeds', async () => {
    axios
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValue({ status: 200, data: { data: [] } });

    const promise = searchAccountsByExternalId(token, '42');
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res).toBeNull();
    expect(axios).toHaveBeenCalledTimes(3);
  });

  it('throws NonRetryableError on 4xx', async () => {
    axios.mockRejectedValue({ response: { status: 400 } });
    await expect(searchAccountsByExternalId(token, '1')).rejects.toBeInstanceOf(
      NonRetryableError
    );
    expect(axios).toHaveBeenCalledTimes(1);
  });
});
