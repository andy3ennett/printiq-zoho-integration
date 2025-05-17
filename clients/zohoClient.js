// zohoClient.js

import axios from 'axios';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const ZOHO_API_BASE =
  process.env.ZOHO_API_BASE_URL || 'https://www.zohoapis.com/crm/v2';
const ZOHO_DEAL_MODULE = 'Deals';
const QUOTE_ID_FIELD = 'PrintIQ_Quote_ID';

async function getAccessToken() {
  const tokenData = JSON.parse(await fs.readFile('token.json', 'utf-8'));
  return tokenData.access_token;
}

export async function findDealByQuoteId(quoteId) {
  const token = await getAccessToken();
  const url = `${ZOHO_API_BASE}/${ZOHO_DEAL_MODULE}/search?criteria=(${QUOTE_ID_FIELD}:equals:"${quoteId}")`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    });
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding deal by Quote ID:', error.message);
    return null;
  }
}

export async function updateDealStage(dealId, stage, payload = {}) {
  const token = await getAccessToken();
  const url = `${ZOHO_API_BASE}/${ZOHO_DEAL_MODULE}/${dealId}`;

  const updateFields = {
    Stage: stage,
  };

  // Add invoice fields if present in payload
  if (payload.invoice_number)
    updateFields.PrintIQ_Invoice_Number = payload.invoice_number;
  if (payload.invoice_date)
    updateFields.PrintIQ_Invoice_Date = payload.invoice_date;
  if (payload.invoice_value) updateFields.Amount = payload.invoice_value;
  if (payload.invoice_id) updateFields.PrintIQ_Invoice_ID = payload.invoice_id;

  try {
    const response = await axios.put(
      url,
      { data: [updateFields] },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating deal stage:', error.message);
    throw error;
  }
}
