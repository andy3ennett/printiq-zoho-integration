import { createOrUpdateAddress } from '../clients/zohoClient.js';
import { getValidAccessToken } from '../auth/tokenManager.js';
import syncLogger from '../../logs/syncLogger.js';

export async function processPrintIQAddressWebhook(data) {
  try {
    await getValidAccessToken();

    if (!data || !data.Address || !data.Address.AddressKey) {
      syncLogger.warn('⚠️ Address webhook missing key data. Skipping...');
      return;
    }

    await createOrUpdateAddress(data);
    syncLogger.success(`✅ Synced address: ${data.Address.AddressKey}`);
  } catch (err) {
    syncLogger.logError('❌ Failed to process address webhook:', err);
  }
}
