// Basic smoke test to ensure handler modules load and execute safely

console.log('🧪 Starting handler module sanity checks...');

try {
  const {
    processPrintIQCustomerWebhook,
  } = require('../sync/handlers/processPrintIQCustomerWebhook');
  const {
    processPrintIQContactWebhook,
  } = require('../sync/handlers/processPrintIQContactWebhook');
  const {
    processPrintIQAddressWebhook,
  } = require('../sync/handlers/processPrintIQAddressWebhook');
  const { getValidAccessToken } = require('../sync/auth/tokenManager');

  (async () => {
    await getValidAccessToken(); // simulate access
    await processPrintIQCustomerWebhook({ ID: 1, Name: 'Test Co.' });
    await processPrintIQContactWebhook({
      FullName: 'John Smith',
      Email: 'test@example.com',
    });
    await processPrintIQAddressWebhook({
      PrintIQ_Customer_ID: 1,
      Address: { AddressKey: 123 },
    });
    console.log('✅ Handlers executed without errors');
  })();
} catch (err) {
  console.error('❌ Handler test failed:', err);
  process.exit(1);
}
