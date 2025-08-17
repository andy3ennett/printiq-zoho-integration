// src/middleware/metrics.js
import client from 'prom-client';

// Registry is always created but metrics are only collected when enabled.
const register = new client.Registry();
const isEnabled = process.env.ENABLE_METRICS === 'true';

let httpRequestsTotal;
let httpRequestDurationSeconds;
let httpRequestErrorsTotal;
let jobDurationSeconds;

if (isEnabled) {
  client.collectDefaultMetrics({ register });

  httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  });

  httpRequestDurationSeconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  });

  httpRequestErrorsTotal = new client.Counter({
    name: 'http_request_errors_total',
    help: 'Number of error responses (status >= 400)',
    labelNames: ['method', 'route', 'status'],
  });

  jobDurationSeconds = new client.Histogram({
    name: 'customer_upsert_job_duration_seconds',
    help: 'Duration of customer upsert jobs in seconds',
  });

  [
    httpRequestsTotal,
    httpRequestDurationSeconds,
    httpRequestErrorsTotal,
    jobDurationSeconds,
  ].forEach(m => register.registerMetric(m));
}

export function metricsMiddleware(req, res, next) {
  if (!isEnabled) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const dur = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path || 'unknown',
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, dur);
    if (res.statusCode >= 400) {
      httpRequestErrorsTotal.inc(labels);
    }
  });
  next();
}

function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  register
    .metrics()
    .then(m => res.end(m))
    .catch(err => res.status(500).end(String(err)));
}

export function metricsRoute(app) {
  if (!isEnabled) return;
  app.get('/metrics', metricsHandler);
}

export function startTimer() {
  const start = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - start) / 1e9;
}

export function observeJobDuration(seconds) {
  if (isEnabled && jobDurationSeconds) {
    jobDurationSeconds.observe(seconds);
  }
}

export { register };
