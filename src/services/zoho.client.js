import axios from 'axios';
import { zohoUrl } from '../config/env.js';

async function request(token, method, path, data) {
  const url = zohoUrl(path);
  const headers = { Authorization: `Zoho-oauthtoken ${token}` };
  const res = await axios({ method, url, headers, data });
  return res.data;
}

async function searchAccountByExternalId(token, extId) {
  const q = encodeURIComponent(`(External_ID:equals:${extId})`);
  const data = await request(token, 'get', `/Accounts/search?criteria=${q}`);
  const recs = data?.data || [];
  return recs[0] || null;
}

async function createAccount(token, fields) {
  const payload = { data: [fields], trigger: [] };
  const data = await request(token, 'post', '/Accounts', payload);
  const rec = data?.data?.[0] || {};
  return { id: rec?.details?.id || rec?.id };
}

async function updateAccount(token, id, fields) {
  const payload = { data: [{ id, ...fields }], trigger: [] };
  await request(token, 'put', '/Accounts', payload);
  return { id };
}

export const zohoClient = {
  searchAccountByExternalId,
  createAccount,
  updateAccount,
};
export default zohoClient;
