const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TOKEN_PATH = path.resolve(__dirname, '../../token.json');
const tokenUrl = `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`;
console.log('🔍 Refresh URL:', tokenUrl);

function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log(`💾 Token saved successfully to: ${TOKEN_PATH}`);
  } catch (err) {
    console.error(`❌ Failed to save token to ${TOKEN_PATH}:`, err.message);
  }
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH, 'utf-8');
      console.log(`📄 Token loaded from: ${TOKEN_PATH}`);
      return JSON.parse(data);
    } else {
      console.warn(`⚠️ Token file not found at: ${TOKEN_PATH}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ Error reading token from ${TOKEN_PATH}:`, err.message);
    return null;
  }
}

async function refreshAccessToken() {
  const tokens = loadTokens();
  if (!tokens || !tokens.refresh_token) {
    throw new Error('No refresh token available.');
  }

  console.log('🔄 Refreshing Zoho access token...');

  try {
    const response = await axios.post(
      `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
      null,
      {
        params: {
          refresh_token: tokens.refresh_token,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: 'refresh_token',
        },
      }
    );

    tokens.access_token = response.data.access_token;
    tokens.expires_in = Date.now() + response.data.expires_in * 1000;

    saveTokens(tokens);
    console.log('✅ Access token refreshed!');
    return tokens.access_token;
  } catch (error) {
    console.error(
      '❌ Failed to refresh access token:',
      error.response?.data || error.message
    );
    throw new Error('Failed to refresh access token');
  }
}

function getTokens() {
  try {
    const rawData = fs.readFileSync(TOKEN_PATH);
    return JSON.parse(rawData);
  } catch (error) {
    console.error('❌ Failed to load tokens in getTokens:', error.message);
    return null;
  }
}

module.exports = {
  saveTokens,
  loadTokens,
  getTokens,
  refreshAccessToken,
};
