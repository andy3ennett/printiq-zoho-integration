import { describe, it, expect, afterAll } from 'vitest';
import express from 'express';
import { loggingMiddleware } from '../../src/middleware/logging.js';

// tiny test server helper
function makeApp(ensureFn) {
  const app = express();
  app.use(loggingMiddleware);

  app.get('/readyz', async (req, res) => {
    try {
      await ensureFn();
      res.status(200).json({ ready: true });
    } catch {
      res.status(503).json({ ready: false });
    }
  });
  return app;
}

describe('/readyz', () => {
  let server, url;

  afterAll(async () => {
    if (server) server.close();
  });

  it('returns 200 when token check passes', async () => {
    const app = makeApp(async () => Promise.resolve());
    server = app.listen(0);
    const port = server.address().port;
    url = `http://127.0.0.1:${port}/readyz`;

    const res = await fetch(url);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ready).toBe(true);
  });

  it('returns 503 when token check fails', async () => {
    const app = makeApp(async () => {
      throw new Error('nope');
    });
    server = app.listen(0);
    const port = server.address().port;
    url = `http://127.0.0.1:${port}/readyz`;

    const res = await fetch(url);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ready).toBe(false);
  });
});
