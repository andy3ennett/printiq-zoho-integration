import 'dotenv/config';
import { zohoAccountsUrl, zohoUrl, env } from './src/config/env.js';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { loggingMiddleware } from './src/middleware/logging.js';
import { logger } from './src/utils/logger.js';

import { requireTokenAuth } from './sync/auth/tokenAuth.js';
import { getValidAccessToken, tokenDoctor } from './sync/auth/tokenManager.js';
import printiqWebhooks from './sync/routes/printiqWebhooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.use(loggingMiddleware);

// Basic health and readiness endpoints
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

app.get('/readyz', async (req, res) => {
  try {
    // Replace this with your real check if named differently:
    if (typeof ensureAccessToken === 'function') {
      await ensureAccessToken();
    }
    // Don’t leak env in production
    const meta =
      process.env.NODE_ENV !== 'production'
        ? { ts: new Date().toISOString() }
        : {};
    res.status(200).json({ ready: true, ...meta });
  } catch (e) {
    logger.warn({ err: e?.message || String(e) }, 'readyz: token check failed');
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
    const response = await axios.get(zohoUrl('/users?type=CurrentUser'), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    const user = response.data.users[0];
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
    console.error('Health check failed:', err.message);
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
    console.error('Health check log error:', err.message);
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

    const crmRes = await axios.get(zohoUrl('/users?type=CurrentUser'), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    const user = crmRes.data.users[0];
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
    console.error('Health check failure:', err.message);
    res.status(500).json({
      status: 'FAIL',
      message: 'One or more checks failed',
      error: err.message,
    });
  }
});

app.get('/readyz', async (req, res) => {
  try {
    // replace with your real check; e.g., await ensureAccessToken()
    await tokenDoctor.check(); // or ensureAccessToken()
    const meta =
      process.env.NODE_ENV !== 'production'
        ? { ts: new Date().toISOString() }
        : {};
    res.status(200).json({ ready: true, ...meta });
  } catch (e) {
    res.status(503).json({ ready: false });
  }
});

app.use('/webhooks/printiq', printiqWebhooks);

app.listen(port, async () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  try {
    await tokenDoctor();
    console.log('✅ Token Doctor: All green! Ready to sync.');
  } catch (err) {
    console.error('🛑 Token Doctor found an issue at startup:', err.message);
  }
});
