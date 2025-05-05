const {
  searchZohoAccount,
  createZohoAccount,
  updateZohoAccount,
} = require('./zohoApi');
const { syncLogger } = require('./logger');

async function processPrintIQCustomerWebhook(customerData) {
  console.log('📬 Received PrintIQ Webhook:', customerData);

  const accountName = customerData.CustomerName || customerData.CompanyName; // Adjust to real field names
  if (!accountName) {
    throw new Error('No Account Name found in webhook payload.');
  }

  const accountPayload = {
    Account_Name: accountName,
    Phone: customerData.PhoneNumber || '',
    Website: customerData.Website || '',
    Billing_Street: customerData.BillingAddress?.Street || '',
    Billing_City: customerData.BillingAddress?.City || '',
    Billing_State: customerData.BillingAddress?.State || '',
    Billing_Code: customerData.BillingAddress?.PostalCode || '',
    Billing_Country: customerData.BillingAddress?.Country || '',
  };

  // Deduplication
  const existingAccount = await searchZohoAccount(accountName);

  if (existingAccount) {
    console.log(`⚡ Updating existing Account: ${accountName}`);
    await updateZohoAccount(existingAccount.id, accountPayload);
    syncLogger.info(`Updated Account via webhook: ${accountName}`);
  } else {
    console.log(`✨ Creating new Account: ${accountName}`);
    await createZohoAccount(accountPayload);
    syncLogger.info(`Created new Account via webhook: ${accountName}`);
  }
}

module.exports = {
  processPrintIQCustomerWebhook,
};
