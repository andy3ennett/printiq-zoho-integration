require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { requireTokenAuth } = require('./auth/tokenAuth');

const {
  processPrintIQCustomerWebhook,
} = require('./sync/handlers/processPrintIQCustomerWebhook');
const {
  processPrintIQContactWebhook,
} = require('./sync/handlers/processPrintIQContactWebhook');
const {
  processPrintIQAddressWebhook,
} = require('./sync/handlers/processPrintIQAddressWebhook');
// Optional: include if quote webhook is used
// const { processQuoteAcceptedWebhook } = require('./sync/handlers/processQuoteAcceptedWebhook');

const {
  getValidAccessToken,
  tokenDoctor,
} = require('./sync/auth/tokenManager');

const app = express();
const port = 3000;

// OAuth Step 1: Redirect to Zoho authorization
app.get('/auth', (req, res) => {
  const authUrl = `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.READ&client_id=${process.env.ZOHO_CLIENT_ID}&response_type=code&access_type=offline&prompt=consent&redirect_uri=${process.env.ZOHO_REDIRECT_URI}`;
  res.redirect(authUrl);
});

// OAuth Step 2: Handle Zoho callback and save tokens
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No authorization code provided.');

  try {
    const response = await axios.post(
      `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
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

// Health check
app.get('/health-check', async (req, res) => {
  try {
    const token = await getValidAccessToken();
    const response = await axios.get(
      `${process.env.ZOHO_API_BASE}/users?type=CurrentUser`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }
    );

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
      api_base: process.env.ZOHO_API_BASE,
      token_expires_in_seconds: Math.round(
        (user.expires_in - Date.now()) / 1000
      ),
    });
  } catch (err) {
    console.error('Health check failed:', err.response?.data || err.message);
    res.status(500).json({
      status: 'FAIL',
      message: 'Failed to connect to Zoho CRM',
      error: err.response?.data || err.message,
    });
  }
});

// Log health check
app.get('/health/logs', async (req, res) => {
  const logDir = path.join(__dirname, 'logs');

  try {
    const files = fs
      .readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(file => {
        const fullPath = path.join(logDir, file);
        const stats = fs.statSync(fullPath);
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
    console.error('Health check log error:', err);
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

    // Check Zoho CRM connection
    const crmRes = await axios.get(
      `${process.env.ZOHO_API_BASE}/users?type=CurrentUser`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }
    );

    const user = crmRes.data.users[0];

    // Get recent logs
    const files = fs
      .readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(file => {
        const fullPath = path.join(logDir, file);
        const stats = fs.statSync(fullPath);
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
        apiBase: process.env.ZOHO_API_BASE,
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

// Webhook wrapper
const withWebhookHandler = handler => async (req, res) => {
  try {
    await handler(req.body);
    res.status(200).send('Webhook processed successfully.');
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).send('Failed to process webhook.');
  }
};

app.use(express.json());

app.post(
  '/webhook/printiq/customer',
  withWebhookHandler(processPrintIQCustomerWebhook)
);
app.post(
  '/webhook/printiq/contact',
  withWebhookHandler(processPrintIQContactWebhook)
);
app.post(
  '/webhook/printiq/address',
  withWebhookHandler(processPrintIQAddressWebhook)
);
// Optional: add if quote webhook is used
// app.post('/webhook/printiq/quote-accepted', withWebhookHandler(processQuoteAcceptedWebhook));

// Start server
app.listen(port, async () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  try {
    await tokenDoctor();
    console.log('✅ Token Doctor: All green! Ready to sync.');
  } catch (err) {
    console.error('🛑 Token Doctor found an issue at startup:', err.message);
  }
});
