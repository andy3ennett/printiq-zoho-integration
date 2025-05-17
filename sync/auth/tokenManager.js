import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
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
  console.log('🔄 Refreshing Zoho access token...');
  try {
    const response = await axios.post(
      `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
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

    console.log('✅ Access token refreshed successfully.');
  } catch (error) {
    console.error(
      '❌ Failed to refresh access token:',
      error.response?.data || error.message
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
  console.log('🩺 Running Token Doctor...');
  const token = await getValidAccessToken();

  try {
    const response = await axios.get(
      `${process.env.ZOHO_API_BASE}/users?type=CurrentUser`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }
    );

    const user = response.data.users[0];
    console.log(
      `✅ CRM Access OK. Logged in as: ${user.full_name} (${user.email})`
    );
  } catch (err) {
    console.error('❌ Token check failed:', err.response?.data || err.message);
    throw new Error('Token appears invalid for CRM access.');
  }
}
