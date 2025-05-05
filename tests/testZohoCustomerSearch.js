require('dotenv').config({ path: './.env' });
const axios = require('axios');
const {
  refreshAccessToken,
  getTokens,
} = require('../sync/helpers/zohoAuthHelpers');
const { ZOHO_API_BASE } = process.env;

const testCustomerID = '14357'; // Replace with your test CustomerID

async function testCustomerLookup() {
  try {
    await refreshAccessToken();
    const { access_token } = getTokens();

    const response = await axios.get(`${ZOHO_API_BASE}/Accounts/search`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${access_token}`,
      },
      params: {
        criteria: `(PrintIQ_Customer_ID:equals:"${testCustomerID}")`,
      },
    });

    if (response.data.data && response.data.data.length > 0) {
      console.log('✅ Found account:', response.data.data[0]);
    } else {
      console.warn(
        `⚠️ No account found for PrintIQ_Customer_ID = ${testCustomerID}`
      );
    }
  } catch (error) {
    console.error('❌ API error:', error.response?.data || error.message);
  }
}

testCustomerLookup();
