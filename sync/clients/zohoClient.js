// sync/clients/zohoClient.js

/**
 * Lookup a Deal in Zoho CRM by Quote ID (custom field).
 */
import axios from 'axios';
import syncLogger from '../../logs/syncLogger.js';
import { zohoUrl } from '../../src/config/env.js';

async function getAccessToken() {
  // Placeholder: Replace this with real token manager
  return process.env.ZOHO_ACCESS_TOKEN;
}

/**
 * Lookup a Deal in Zoho CRM by Quote ID (custom field).
 */
export async function findDealByQuoteId(quoteId) {
  try {
    const token = await getAccessToken();
    const criteria = `(PrintIQ_Quote_ID:equals:${quoteId})`;
    const response = await axios.get(zohoUrl('Deals/search'), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params: { criteria },
    });

    const deals = response.data?.data;
    if (!deals || deals.length === 0) {
      syncLogger && syncLogger.warn
        ? syncLogger.warn(`No deal found for Quote ID: ${quoteId}`)
        : console.warn(`[Zoho Sync] No deal found for Quote ID: ${quoteId}`);
      return null;
    }

    return deals[0]; // return first match
  } catch (err) {
    if (syncLogger && syncLogger.error) {
      syncLogger.error(
        `Error finding deal for Quote ID ${quoteId}:`,
        err.message
      );
    } else {
      console.error(
        `[Zoho Sync] Error finding deal for Quote ID ${quoteId}:`,
        err.message
      );
    }
    throw err;
  }
}

/**
 * Update a Deal's stage based on Quote ID.
 */
export async function updateDealStageByQuoteId(quoteId, newStage) {
  const deal = await findDealByQuoteId(quoteId);
  if (!deal) {
    syncLogger.warn(
      `Cannot update stage. Deal not found for Quote ID: ${quoteId}`
    );
    return null;
  }

  try {
    const token = await getAccessToken();
    const response = await axios.put(
      zohoUrl('Deals'),
      {
        data: [
          {
            id: deal.id,
            Stage: newStage,
          },
        ],
      },
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }
    );

    syncLogger.info(`Deal ${quoteId} updated to stage: ${newStage}`);
    return response.data;
  } catch (err) {
    syncLogger.error(
      `Error updating deal stage for Quote ID ${quoteId}:`,
      err.message
    );
    throw err;
  }
}

/**
 * Attach invoice fields to an existing Deal.
 */
export async function attachInvoiceToDeal(quoteId, invoiceData) {
  const deal = await findDealByQuoteId(quoteId);
  if (!deal) {
    syncLogger.warn(
      `Cannot attach invoice. Deal not found for Quote ID: ${quoteId}`
    );
    return null;
  }

  try {
    const token = await getAccessToken();
    const response = await axios.put(
      zohoUrl('Deals'),
      {
        data: [
          {
            id: deal.id,
            PrintIQ_Invoice_ID: invoiceData.invoiceId,
            PrintIQ_Invoice_Number: invoiceData.invoiceNumber,
            PrintIQ_Invoice_Date: invoiceData.invoiceDate,
            Amount: invoiceData.invoiceValue,
          },
        ],
      },
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }
    );

    syncLogger.info(`Invoice attached to deal ${quoteId}`);
    return response.data;
  } catch (err) {
    syncLogger.error(
      `Error attaching invoice for Quote ID ${quoteId}:`,
      err.message
    );
    throw err;
  }
}

/**
 * Upsert Customer record in Zoho CRM (Accounts module).
 */
export async function createOrUpdateCustomer(customerData) {
  const token = await getAccessToken();

  try {
    const searchRes = await axios.get(zohoUrl('Accounts/search'), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params: {
        criteria: `(PrintIQ_Customer_ID:equals:${customerData.PrintIQ_Customer_ID})`,
      },
    });

    const match = searchRes.data?.data?.[0];

    const payload = {
      data: [customerData],
    };

    if (match) {
      payload.data[0].id = match.id;
    }

    const res = await axios.post(zohoUrl('Accounts/upsert'), payload, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    syncLogger.info(
      `${match ? 'Updated' : 'Created'} Zoho Account for customer ${customerData.PrintIQ_Customer_ID}`
    );

    return res.data;
  } catch (err) {
    syncLogger.error(
      `Error upserting Zoho Account for customer ${customerData.PrintIQ_Customer_ID}:`,
      err.message
    );
    throw err;
  }
}

/**
 * Upsert Contact record in Zoho CRM (Contacts module).
 */
export async function createOrUpdateContact(contactData) {
  const token = await getAccessToken();

  try {
    const searchRes = await axios.get(zohoUrl('Contacts/search'), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params: {
        criteria: `(PrintIQ_Contact_ID:equals:${contactData.PrintIQ_Contact_ID})`,
      },
    });

    const match = searchRes.data?.data?.[0];

    const payload = {
      data: [contactData],
    };

    if (match) {
      payload.data[0].id = match.id;
    }

    const res = await axios.post(zohoUrl('Contacts/upsert'), payload, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    syncLogger.info(
      `${match ? 'Updated' : 'Created'} Zoho Contact for contact ${contactData.PrintIQ_Contact_ID}`
    );

    return res.data;
  } catch (err) {
    syncLogger.error(
      `Error upserting Zoho Contact for contact ${contactData.PrintIQ_Contact_ID}:`,
      err.message
    );
    throw err;
  }
}

/**
 * Upsert Address record in Zoho CRM (Addresses module).
 * Matches using PrintIQ_Address_ID.
 */
export async function createOrUpdateAddress(addressData) {
  const token = await getAccessToken();

  try {
    const searchRes = await axios.get(zohoUrl('Addresses/search'), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params: {
        criteria: `(PrintIQ_Address_ID:equals:${addressData.PrintIQ_Address_ID})`,
      },
    });

    const match = searchRes.data?.data?.[0];

    const payload = {
      data: [addressData],
    };

    if (match) {
      payload.data[0].id = match.id;
    }

    const res = await axios.post(zohoUrl('Addresses/upsert'), payload, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    syncLogger.info(
      `${match ? 'Updated' : 'Created'} Zoho Address for address ${addressData.PrintIQ_Address_ID}`
    );

    return res.data;
  } catch (err) {
    syncLogger.error(
      `Error upserting Zoho Address for address ${addressData.PrintIQ_Address_ID}:`,
      err.message
    );
    throw err;
  }
}

/**
 * Log a diagnostic message when a Quote ID lookup fails.
 */
export function logMissingDeal(quoteId, event) {
  console.warn(
    `[Zoho Sync] Deal not found: Quote ID=${quoteId}, Event=${event}`
  );
}
