import {
  findZohoAccountByPrintIQId,
  updateAccountAddressSubform,
} from '../helpers/zohoApi.js';
import { getValidAccessToken } from '../auth/tokenManager.js';
import syncLogger from '../../logs/syncLogger.js';

export async function processPrintIQAddressWebhook(data) {
  try {
    await getValidAccessToken();

    const { PrintIQ_Customer_ID, Address } = data;
    if (!PrintIQ_Customer_ID || !Address || !Address.AddressKey) {
      syncLogger.warn('⚠️ Address webhook missing key data. Skipping...');
      return;
    }

    const account = await findZohoAccountByPrintIQId(PrintIQ_Customer_ID);
    if (!account) {
      syncLogger.warn(
        `⚠️ No Zoho account found for PrintIQ CustomerID ${PrintIQ_Customer_ID}`
      );
      return;
    }

    const updateResult = await updateAccountAddressSubform(account.id, Address);
    if (updateResult) {
      syncLogger.logInfo(
        `✅ Updated address for account ${account.Account_Name} (${account.id})`
      );
    }
  } catch (err) {
    syncLogger.logError('❌ Failed to process address webhook:', err);
  }
}
