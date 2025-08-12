import axios from 'axios';
import { zohoUrl } from '../../src/config/env.js';
import * as tokenManager from '../auth/tokenManager.js';

// Always return a Promise that resolves to a token.
// Supports both named and default exports from the token manager.
export async function getValidAccessToken() {
  if (typeof tokenManager.getValidAccessToken === 'function') {
    return await tokenManager.getValidAccessToken();
  }
  if (tokenManager?.default?.getValidAccessToken) {
    return await tokenManager.default.getValidAccessToken();
  }
  if (typeof tokenManager.getAccessToken === 'function') {
    return await tokenManager.getAccessToken();
  }
  if (tokenManager?.default?.getAccessToken) {
    return await tokenManager.default.getAccessToken();
  }
  throw new Error('No token getter available');
}

export async function createOrUpdateZohoAccount(accountData) {
  const payload = {
    data: [accountData],
    trigger: ['workflow'],
  };

  try {
    const token = await getValidAccessToken();
    const headers = {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    };

    const criteria = `((Integration_ID:equals:${accountData.Integration_ID}) or (Customer_Code:equals:${accountData.Customer_Code}))`;
    const searchUrl = `${zohoUrl('Accounts/search')}?criteria=${encodeURIComponent(
      criteria
    )}`;
    const searchRes = await axios.get(searchUrl, { headers });

    if (
      searchRes.data &&
      searchRes.data.data &&
      searchRes.data.data.length > 0
    ) {
      const existingId = searchRes.data.data[0].id;
      const updateUrl = zohoUrl(`Accounts/${existingId}`);
      const updatePayload = { data: [{ ...accountData }] };
      const updateRes = await axios.put(updateUrl, updatePayload, { headers });
      return { status: 'updated', id: existingId, result: updateRes.data };
    } else {
      const createUrl = zohoUrl('Accounts');
      const createRes = await axios.post(createUrl, payload, { headers });
      const newId = createRes.data.data[0].details.id;
      return { status: 'created', id: newId, result: createRes.data };
    }
  } catch (err) {
    console.error(
      'Zoho Account Sync Error:',
      err.response?.data || err.message
    );
    throw new Error('Failed to create or update Zoho account');
  }
}

export async function findAccountByCustomerId(customerId) {
  try {
    const token = await getValidAccessToken();
    const headers = {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    };

    const criteria = `(PrintIQ_Customer_ID:equals:${customerId})`;
    const searchUrl = `${zohoUrl('Accounts/search')}?criteria=${encodeURIComponent(
      criteria
    )}`;
    const response = await axios.get(searchUrl, { headers });

    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }

    return null;
  } catch (err) {
    console.error(
      'Error searching Zoho account by CustomerID:',
      err.response?.data || err.message
    );
    throw new Error('Failed to search for Zoho account');
  }
}

export async function updateAccountAddressSubform(accountId, address) {
  const updateUrl = zohoUrl(`Accounts/${accountId}`);
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

  try {
    const token = await getValidAccessToken();
    const headers = {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    };

    const res = await axios.put(updateUrl, payload, { headers });
    return res.data;
  } catch (err) {
    console.error(
      'Error updating address subform in Zoho:',
      err.response?.data || err.message
    );
    throw new Error('Failed to update address subform');
  }
}

export default {
  getValidAccessToken,
  createOrUpdateZohoAccount,
  findAccountByCustomerId,
  updateAccountAddressSubform,
};
