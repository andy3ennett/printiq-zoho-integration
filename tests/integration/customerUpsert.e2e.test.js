import { describe, it, expect, vi } from 'vitest';
import nock from 'nock';
import { processor } from '../../src/workers/zohoWorker.js';
nock.disableNetConnect();
process.env.HTTP_PROXY = '';
process.env.http_proxy = '';
process.env.HTTPS_PROXY = '';
process.env.https_proxy = '';
process.env.npm_config_proxy = '';
process.env.npm_config_https_proxy = '';
process.env.GLOBAL_AGENT_HTTP_PROXY = '';

vi.mock('../../sync/auth/tokenManager.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));

describe('customer upsert processor e2e', () => {
  it('creates account when missing', async () => {
    nock('https://www.zohoapis.com')
      .get('/crm/v3/Accounts/search')
      .query(true)
      .reply(200, { data: [] })
      .post('/crm/v3/Accounts')
      .reply(201, { data: [{ details: { id: 'z1' } }] });

    const job = {
      id: '1',
      data: { requestId: 'r', printiqCustomerId: 1, name: 'Acme' },
      discard: vi.fn(),
      attemptsMade: 0,
    };
    const res = await processor(job);
    expect(res.zohoId).toBe('z1');
    expect(nock.isDone()).toBe(true);
  });

  it('updates account when exists', async () => {
    nock('https://www.zohoapis.com')
      .get('/crm/v3/Accounts/search')
      .query(true)
      .reply(200, { data: [{ id: 'z2' }] })
      .put('/crm/v3/Accounts/z2')
      .reply(200, { data: [{ details: { id: 'z2' } }] });

    const job = {
      id: '2',
      data: { requestId: 'r', printiqCustomerId: 2, name: 'Beta' },
      discard: vi.fn(),
      attemptsMade: 0,
    };
    const res = await processor(job);
    expect(res.path).toBe('update');
    expect(nock.isDone()).toBe(true);
  });

  it('retries on 429 then succeeds', async () => {
    nock('https://www.zohoapis.com')
      .get('/crm/v3/Accounts/search')
      .query(true)
      .reply(429)
      .get('/crm/v3/Accounts/search')
      .query(true)
      .reply(429)
      .get('/crm/v3/Accounts/search')
      .query(true)
      .reply(200, { data: [] });

    nock('https://www.zohoapis.com')
      .post('/crm/v3/Accounts')
      .reply(201, { data: [{ details: { id: 'z3' } }] });

    const job = {
      id: '3',
      data: { requestId: 'r', printiqCustomerId: 3, name: 'Gamma' },
      discard: vi.fn(),
      attemptsMade: 0,
    };
    const res = await processor(job);
    expect(res.zohoId).toBe('z3');
    expect(nock.isDone()).toBe(true);
  });
});

afterAll(() => {
  nock.enableNetConnect();
  nock.cleanAll();
});
