import { upsertZohoContact } from '../helpers/zohoApi.js';
import { getValidAccessToken } from '../auth/tokenManager.js';
import syncLogger from '../../logs/syncLogger.js';

export async function processPrintIQContactWebhook(contactData) {
  try {
    await getValidAccessToken();

    const {
      ContactKey,
      IntegrationID,
      FirstName,
      Surname,
      FullName,
      Email,
      Phone,
      Mobile,
      CustomerID,
      CustomerCode,
      Title,
    } = contactData;

    if (!FullName && !Email) {
      syncLogger.warn('⚠️ Skipping contact webhook with missing name/email.');
      return;
    }

    const contactRecord = {
      First_Name: FirstName || '',
      Last_Name: Surname || '',
      Full_Name: FullName,
      Email: Email || '',
      Phone: Phone || Mobile || '',
      Title: Title || '',
      Account_Name: {
        name: CustomerCode || `Customer ${CustomerID}`,
      },
      External_Contact_ID: IntegrationID || String(ContactKey),
    };

    await upsertZohoContact(contactRecord);
    syncLogger.log(`✅ Contact synced: ${FullName || Email}`);
  } catch (err) {
    syncLogger.error('❌ Contact webhook sync failed:', err.message);
  }
}