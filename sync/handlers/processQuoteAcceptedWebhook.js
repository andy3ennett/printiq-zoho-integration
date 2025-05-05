import {
  searchDealsByQuoteNumber,
  createNewDeal,
  updateDealStage,
} from '../helpers/zohoApi.js';
import { getValidAccessToken } from '../auth/tokenManager.js';
import syncLogger from '../../logs/syncLogger.js';

export async function processQuoteAcceptedWebhook(payload) {
  try {
    await getValidAccessToken();

    const quoteNo = payload.QuoteNo;
    const customerName =
      payload.Products?.[0]?.MiddlewareProductDetail?.cusName || 'Unknown Customer';
    const totalPriceExTax = payload.TotalPrice;
    const jobReference = payload.JobReference;
    const currencyCode = payload.CurCode || 'GBP';

    if (!quoteNo) throw new Error('Missing Quote Number in payload');

    syncLogger.log(`📨 Received Quote Acceptance webhook for QuoteNo: ${quoteNo}`);

    const existingDeal = await searchDealsByQuoteNumber(quoteNo);

    if (existingDeal) {
      syncLogger.log(`🔄 Updating existing deal stage for Quote ${quoteNo}.`);
      await updateDealStage(existingDeal.id, 'In Production');
    } else {
      syncLogger.log(`➕ Creating new deal for Quote ${quoteNo}.`);
      await createNewDeal({
        dealName: `${customerName} - ${quoteNo}`,
        amount: totalPriceExTax,
        quoteNo,
        jobReference,
        currency: currencyCode,
        stage: 'In Production',
      });
    }

    syncLogger.log(`✅ Quote ${quoteNo} processed successfully.`);
  } catch (err) {
    syncLogger.error(`❌ Error processing quote acceptance: ${err.message}`);
    throw err;
  }
}