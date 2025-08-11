import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { zohoAccountsUrl, crmUrl } from '../../src/config/env.js';
import { logger } from '../../src/utils/logger.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '../../token.json');
let tokens = {};

if (fs.existsSync(TOKEN_FILE)) {
  tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
}

function saveTokens() {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

export async function refreshAccessToken() {
  logger.info('🔄 Refreshing Zoho access token...');
  try {
    const response = await axios.post(
      zohoAccountsUrl('/oauth/v2/token'),
      null,
      {
        params: {
          grant_type: 'refresh_token',
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
        },
      }
    );

    tokens.access_token = response.data.access_token;
    tokens.expires_in = Date.now() + response.data.expires_in * 1000;
    saveTokens();

    logger.info('✅ Access token refreshed successfully.');
  } catch (error) {
    logger.error(
      { err: error.response?.data || error.message },
      '❌ Failed to refresh access token'
    );
    throw new Error('Failed to refresh access token.');
  }
}

export async function getValidAccessToken() {
  if (!tokens.access_token || !tokens.expires_in) {
    throw new Error(
      '❌ No valid access token found. Please authenticate via /auth.'
    );
  }

  const msUntilExpiry = tokens.expires_in - Date.now();
  if (msUntilExpiry < 5 * 60 * 1000) {
    await refreshAccessToken();
  }

  return tokens.access_token;
}

export async function tokenDoctor() {
  logger.info('🩺 Running Token Doctor...');
  const token = await getValidAccessToken();

  try {
    const response = await axios.get(crmUrl('/users?type=CurrentUser'), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    const user = response.data.users[0];
    logger.info(
      { user: { name: user.full_name, email: user.email } },
      '✅ CRM Access OK'
    );
  } catch (err) {
    logger.error(
      { err: err.response?.data || err.message },
      '❌ Token check failed'
    );
    throw new Error('Token appears invalid for CRM access.');
  }
}

export function _resetTokens() {
  tokens = {};
}

export function _setTokens(newTokens) {
  tokens = newTokens;
}
