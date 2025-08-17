import 'dotenv/config';
import { zohoAccountsUrl, env } from './src/config/env.js';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { loggingMiddleware } from './src/middleware/logging.js';
import { logger } from './src/utils/logger.js';
import { redis } from './src/services/idempotency.js';
import { requireTokenAuth } from './sync/auth/tokenAuth.js';
import { getValidAccessToken, tokenDoctor } from './sync/auth/tokenManager.js';
import printiqWebhooks from './sync/routes/printiqWebhooks.js';
import { metricsMiddleware, metricsRoute } from './src/middleware/metrics.js';
import { getCurrentUser } from './src/zoho/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.use(loggingMiddleware);
app.use(metricsMiddleware);

// Basic health and readiness endpoints
metricsRoute(app);
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

app.get('/readyz', async (req, res) => {
  try {
    await getValidAccessToken();
    await redis.ping();
    const meta =
      process.env.NODE_ENV !== 'production'
        ? { ts: new Date().toISOString() }
        : {};
    res.status(200).json({ ready: true, ...meta });
  } catch (e) {
    logger.warn({ err: e?.message || String(e) }, 'readyz failed');
    res.status(503).json({ ready: false });
  }
});
app.get('/auth', (req, res) => {
  const authUrl = `${zohoAccountsUrl('/oauth/v2/auth')}?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.READ&client_id=${process.env.ZOHO_CLIENT_ID}&response_type=code&access_type=offline&prompt=consent&redirect_uri=${process.env.ZOHO_REDIRECT_URI}`;
  res.redirect(authUrl);
});

app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No authorization code provided.');

  try {
    const response = await axios.post(
      zohoAccountsUrl('/oauth/v2/token'),
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          redirect_uri: process.env.ZOHO_REDIRECT_URI,
          code,
        },
      }
    );

    const tokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: Date.now() + response.data.expires_in * 1000,
    };

    fs.writeFileSync(
      path.resolve(__dirname, 'token.json'),
      JSON.stringify(tokens, null, 2)
    );
    console.log('✅ Authentication successful. Tokens saved.');
    res.send('Authentication successful! You can close this window.');
  } catch (error) {
    console.error(
      'OAuth callback error:',
      error.response?.data || error.message
    );
    res.status(500).send('Authentication failed.');
  }
});

app.get('/health-check', async (req, res) => {
  try {
    const token = await getValidAccessToken();
    const user = await getCurrentUser(token);
    res.json({
      status: 'OK',
      message: 'Connected to Zoho CRM successfully!',
      user: {
        full_name: user.full_name,
        email: user.email,
        role: user.role.name,
        id: user.id,
      },
      api_base: env.ZOHO_BASE_URL,
      token_expires_in_seconds: Math.round(
        (user.expires_in - Date.now()) / 1000
      ),
    });
  } catch (err) {
    logger.error({ err: err?.message }, 'Health check failed');
    res.status(500).json({
      status: 'FAIL',
      message: 'Failed to connect to Zoho CRM',
      error: err.message,
    });
  }
});

app.get('/health/logs', (req, res) => {
  const logDir = path.join(__dirname, 'logs');

  try {
    const files = fs
      .readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(file => {
        const stats = fs.statSync(path.join(logDir, file));
        return {
          file,
          sizeKB: Math.round(stats.size / 1024),
          lastModified: stats.mtime.toISOString(),
        };
      });

    res.json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      system: {
        host: os.hostname(),
        uptimeSeconds: os.uptime(),
        memoryMB: {
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024),
        },
      },
      recentLogs: files
        .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
        .slice(0, 5),
    });
  } catch (err) {
    logger.error({ err: err?.message }, 'Health logs read error');
    res.status(500).json({
      status: 'FAIL',
      message: 'Unable to read log directory',
      error: err.message,
    });
  }
});

app.get('/health/all', requireTokenAuth, async (req, res) => {
  const logDir = path.join(__dirname, 'logs');

  try {
    const token = await getValidAccessToken();
    const user = await getCurrentUser(token);
    const files = fs
      .readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(file => {
        const stats = fs.statSync(path.join(logDir, file));
        return {
          file,
          sizeKB: Math.round(stats.size / 1024),
          lastModified: stats.mtime.toISOString(),
        };
      });

    res.json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      system: {
        host: os.hostname(),
        uptimeSeconds: os.uptime(),
        memoryMB: {
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024),
        },
      },
      zoho: {
        user: {
          full_name: user.full_name,
          email: user.email,
          role: user.role.name,
          id: user.id,
        },
        apiBase: env.ZOHO_BASE_URL,
      },
      recentLogs: files
        .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
        .slice(0, 5),
    });
  } catch (err) {
    logger.error({ err: err?.message }, 'Health check failure');
    res.status(500).json({
      status: 'FAIL',
      message: 'One or more checks failed',
      error: err.message,
    });
  }
});

app.use('/webhooks/printiq', printiqWebhooks);

app.listen(port, async () => {
  logger.info({ port }, 'Server running');
  try {
    await tokenDoctor();
    logger.info('Token Doctor: All green! Ready to sync.');
  } catch (err) {
    logger.error({ err: err?.message }, 'Token Doctor issue at startup');
  }
});
