import axios from 'axios';
import syncLogger from '../../logs/syncLogger.js';
import { zohoUrl } from '../../src/config/env.js';
const getAuthHeader = token => ({
  Authorization: `Zoho-oauthtoken ${token}`,
  'Content-Type': 'application/json',
});

export async function findZohoAccountByPrintIQId(printIQCustomerId, token) {
  try {
    const response = await axios.get(zohoUrl('Accounts/search'), {
      headers: getAuthHeader(token),
      params: {
        criteria: `(PrintIQ_Customer_ID:equals:${printIQCustomerId})`,
      },
    });

    return response.data.data?.[0] || null;
  } catch (error) {
    syncLogger.error(
      'Error finding Zoho Account by Customer ID:',
      error.response?.data || error.message
    );
    return null;
  }
}

export async function updateAccountAddressSubform(accountId, address, token) {
  try {
    const updateUrl = zohoUrl(`Accounts/${accountId}`);
    const payload = {
      data: [
        {
          id: accountId,
          Address_Subform: [
            {
              Address_Line_1: address.AddressLine1,
              Address_Line_2: address.AddressLine2 || '',
              City: address.City,
              State: address.State,
              Post_Code: address.PostCode,
              Country: address.Country,
              PrintIQ_Address_Key: address.AddressKey?.toString(),
            },
          ],
        },
      ],
    };

    const response = await axios.put(updateUrl, payload, {
      headers: getAuthHeader(token),
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

export async function upsertZohoContact(contactRecord, token) {
  try {
    const url = zohoUrl('Contacts/upsert');
    const payload = {
      data: [contactRecord],
      duplicate_check_fields: ['External_Contact_ID'],
    };

    const response = await axios.post(url, payload, {
      headers: getAuthHeader(token),
    });

    return response.data;
  } catch (err) {
    syncLogger.error(
      'Error upserting contact:',
      err.response?.data || err.message
    );
    throw err;
  }
}

export async function searchDealsByQuoteNumber(quoteNo, token) {
  try {
    const response = await axios.get(zohoUrl('Deals/search'), {
      headers: getAuthHeader(token),
      params: {
        criteria: `(Quote_Number:equals:${quoteNo})`,
      },
    });

    return response.data.data?.[0] || null;
  } catch (error) {
    console.warn('Suppressed error:', error.message);
  }
}

export async function createNewDeal(dealData, token) {
  try {
    const response = await axios.post(
      zohoUrl('Deals'),
      { data: [dealData] },
      { headers: getAuthHeader(token) }
    );

    return response.data;
  } catch (err) {
    throw new Error('Error creating new deal: ' + err.message);
  }
}

export async function updateDealStage(dealId, stageName, token) {
  try {
    const response = await axios.put(
      zohoUrl('Deals'),
      {
        data: [
          {
            id: dealId,
            Stage: stageName,
          },
        ],
      },
      {
        headers: getAuthHeader(token),
      }
    );

    return response.data;
  } catch (err) {
    throw new Error('Error updating deal stage: ' + err.message);
  }
}

export async function createZohoAccount(accountData, token) {
  try {
    const response = await axios.post(
      zohoUrl('Accounts'),
      { data: [accountData] },
      { headers: getAuthHeader(token) }
    );

    return response.data;
  } catch (err) {
    syncLogger.error(
      'Error creating Zoho Account:',
      err.response?.data || err.message
    );
    throw err;
  }
}

export async function updateZohoAccount(accountId, updateData, token) {
  try {
    const response = await axios.put(
      zohoUrl('Accounts'),
      {
        data: [
          {
            id: accountId,
            ...updateData,
          },
        ],
      },
      {
        headers: getAuthHeader(token),
      }
    );
    return response.data;
  } catch (err) {
    syncLogger.error(
      'Error updating Zoho Account:',
      err.response?.data || err.message
    );
    throw err;
  }
}
