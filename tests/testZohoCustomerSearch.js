import { getValidAccessToken } from '../sync/auth/tokenManager.js';
import { findZohoAccountByPrintIQId } from '../sync/helpers/zohoApi.js';

const testCustomerID = 999;

async function runSearchTest() {
  try {
    const token = await getValidAccessToken();
    const account = await findZohoAccountByPrintIQId(testCustomerID, token);

    if (account) {
      console.log('✅ Zoho account found:');
      console.log(account);
    } else {
      console.warn(`⚠️ No account found for PrintIQ_Customer_ID = ${testCustomerID}`);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runSearchTest();