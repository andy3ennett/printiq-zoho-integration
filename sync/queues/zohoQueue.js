// Re-export the actual queue implementation to keep existing imports working
export * from '../../src/queues/zohoQueue.js';

// Optional compat aliases in case the handler expects different names
import { enqueueCustomerUpsert as _enqueueCustomerUpsert } from '../../src/queues/zohoQueue.js';
export const enqueueCustomer = _enqueueCustomerUpsert;
export const addCustomerUpsertJob = _enqueueCustomerUpsert;
