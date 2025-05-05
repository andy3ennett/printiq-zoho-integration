import dotenv from 'dotenv';
import { processPrintIQAddressWebhook } from '../sync/handlers/processPrintIQAddressWebhook.js';
import { refreshAccessToken } from '../sync/auth/tokenManager.js';

dotenv.config();

(async () => {
  try {
    await refreshAccessToken(); // ensure token is fresh

    const testPayload = {
      PrintIQ_Customer_ID: 14357,
      Address: {
        AddressKey: 47109,
        AddressLine1: '456 Updated Street',
        AddressLine2: 'Floor 2',
        City: 'Updated City',
        State: 'Updatedonia',
        PostCode: 'UPD456',
        Country: 'Updateland',
      },
    };

    await processPrintIQAddressWebhook(testPayload);
    console.log('✅ Address webhook test completed successfully');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
})();