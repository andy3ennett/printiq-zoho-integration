import { createOrUpdateCustomer } from '../clients/zohoClient.js';
import { getValidAccessToken } from '../auth/tokenManager.js';
import syncLogger from '../../logs/syncLogger.js';

export async function processPrintIQCustomerWebhook(payload) {
  try {
    await getValidAccessToken();

    const {
      ID,
      Name,
      Phone,
      Website,
      Code,
      Email,
      Fax,
      Comment,
      Active,
      AddressLine1,
      City,
      State,
      Postcode,
      Country,
    } = payload;

    if (!ID || !Name) {
      syncLogger.warn('⚠️ Skipping customer webhook: Missing ID or Name.');
      return;
    }

    const zohoPayload = {
      Account_Name: Name,
      Phone,
      Website,
      PrintIQ_Customer_ID: ID,
      PrintIQ_Customer_Code: Code,
      Email,
      Fax,
      Description: Comment,
      Account_Type: Active === 'Yes' ? 'Active' : 'Inactive',
      Billing_Street: AddressLine1 || '',
      Billing_City: City || '',
      Billing_State: State || '',
      Billing_Code: Postcode || '',
      Billing_Country: Country || '',
    };
    await createOrUpdateCustomer(zohoPayload);
    syncLogger.success(`✅ Synced customer in Zoho CRM: ${Name}`);
  } catch (err) {
    syncLogger.error(`❌ Error handling customer webhook: ${err.message}`);
  }
}
