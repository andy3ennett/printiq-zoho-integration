const axios = require('axios');
const { getValidAccessToken } = require('../auth/tokenManager');
const syncLogger = require('../../logs/syncLogger');

const ZOHO_API_BASE = process.env.ZOHO_API_BASE;

async function getHeaders() {
  const token = await getValidAccessToken();
  return {
    Authorization: `Zoho-oauthtoken ${token}`,
    'Content-Type': 'application/json',
  };
}

// 🔍 Find account by PrintIQ ID (same as findAccountByCustomerId)
async function findZohoAccountByPrintIQId(customerId) {
  try {
    const headers = await getHeaders();
    const criteria = `(PrintIQ_Customer_ID:equals:${customerId})`;
    const url = `${ZOHO_API_BASE}/Accounts/search?criteria=${encodeURIComponent(criteria)}`;
    const response = await axios.get(url, { headers });

    return response.data.data?.[0] || null;
  } catch (err) {
    syncLogger.error(
      'Error finding Zoho Account by Customer ID:',
      err.response?.data || err.message
    );
    return null;
  }
}

// ➕ Create new account
async function createZohoAccount(accountData) {
  try {
    const headers = await getHeaders();
    const payload = {
      data: [accountData],
      trigger: ['workflow'],
    };
    const response = await axios.post(`${ZOHO_API_BASE}/Accounts`, payload, {
      headers,
    });
    return response.data;
  } catch (err) {
    syncLogger.error(
      'Error creating Zoho Account:',
      err.response?.data || err.message
    );
    throw err;
  }
}

// 🔁 Update existing account by ID
async function updateZohoAccount(accountId, updates) {
  try {
    const headers = await getHeaders();
    const payload = {
      data: [
        {
          id: accountId,
          ...updates,
        },
      ],
    };
    const response = await axios.put(`${ZOHO_API_BASE}/Accounts`, payload, {
      headers,
    });
    return response.data;
  } catch (err) {
    syncLogger.error(
      'Error updating Zoho Account:',
      err.response?.data || err.message
    );
    throw err;
  }
}

// 🧩 Update address subform
async function updateAccountAddressSubform(accountId, address) {
  try {
    const headers = await getHeaders();
    const subformEntry = {
      Address_Line_1: address.AddressLine1,
      Address_Line_2: address.AddressLine2 || '',
      City: address.City,
      State: address.State,
      Post_Code: address.PostCode,
      Country: address.Country,
      PrintIQ_Address_Key: address.AddressKey.toString(),
    };

    const payload = {
      data: [
        {
          id: accountId,
          Address_Subform: [subformEntry],
        },
      ],
    };

    const response = await axios.put(`${ZOHO_API_BASE}/Accounts`, payload, {
      headers,
    });
    return response.data;
  } catch (err) {
    syncLogger.error(
      'Error updating address subform:',
      err.response?.data || err.message
    );
    throw err;
  }
}

// 📄 Optional: Quote/Deal-related methods
async function searchDealsByQuoteNumber(quoteNo) {
  const headers = await getHeaders();
  const response = await axios.get(`${ZOHO_API_BASE}/Deals/search`, {
    headers,
    params: {
      criteria: `(Quote_Number:equals:${quoteNo})`,
    },
  });

  return response.data.data?.[0] || null;
}

async function createNewDeal(deal) {
  const headers = await getHeaders();
  const payload = {
    data: [
      {
        Deal_Name: deal.dealName,
        Amount: deal.amount,
        Quote_Number: deal.quoteNo,
        Job_Reference: deal.jobReference,
        Currency: deal.currency,
        Stage: deal.stage,
      },
    ],
  };

  const response = await axios.post(`${ZOHO_API_BASE}/Deals`, payload, {
    headers,
  });
  return response.data;
}

async function updateDealStage(dealId, stage) {
  const headers = await getHeaders();
  const payload = {
    data: [{ id: dealId, Stage: stage }],
  };

  const response = await axios.put(`${ZOHO_API_BASE}/Deals`, payload, {
    headers,
  });
  return response.data;
}

// 📇 Contact upsert
async function upsertZohoContact(contact) {
  try {
    const headers = await getHeaders();
    const payload = { data: [contact], trigger: ['workflow'] };

    const res = await axios.post(`${ZOHO_API_BASE}/Contacts/upsert`, payload, {
      headers,
    });
    return res.data;
  } catch (err) {
    syncLogger.error(
      'Error upserting contact:',
      err.response?.data || err.message
    );
    throw err;
  }
}

module.exports = {
  findZohoAccountByPrintIQId,
  createZohoAccount,
  updateZohoAccount,
  updateAccountAddressSubform,
  searchDealsByQuoteNumber,
  createNewDeal,
  updateDealStage,
  upsertZohoContact,
};
