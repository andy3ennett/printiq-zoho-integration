import { z } from 'zod';

const envSchema = z.object({
  ZOHO_BASE_URL: z.string().url().default('https://www.zohoapis.com/crm/v2'),
  ZOHO_ACCOUNTS_URL: z.string().url().default('https://accounts.zoho.com'),
});

export const env = envSchema.parse(process.env);

const trim = str => str.replace(/\/$/, '');
const strip = str => str.replace(/^\//, '');

export function zohoUrl(path = '') {
  return `${trim(env.ZOHO_BASE_URL)}/${strip(path)}`;
}

export function zohoAccountsUrl(path = '') {
  return `${trim(env.ZOHO_ACCOUNTS_URL)}/${strip(path)}`;
}
