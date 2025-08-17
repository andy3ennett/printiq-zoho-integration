import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

// Metrics module reads env var at import time

describe('metrics middleware', () => {
  it('records request metrics', async () => {
    process.env.ENABLE_METRICS = 'true';
    const { metricsMiddleware, metricsRoute } = await import(
      '../../src/middleware/metrics.js'
    );
    const app = express();
    app.use(metricsMiddleware);
    app.get('/ping', (req, res) => res.send('pong'));
    metricsRoute(app);

    await request(app).get('/ping').expect(200);
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toMatch(/http_requests_total/);
    expect(res.text).toMatch(/http_request_duration_seconds_sum/);
  });
});
