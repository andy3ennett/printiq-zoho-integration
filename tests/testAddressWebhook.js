// testAddressWebhook.js
require('dotenv').config();
const handleAddressWebhook = require('../sync/handlers/handleAddressWebhook');
const { refreshAccessToken } = require('../index');

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

    await handleAddressWebhook(testPayload);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
})();
