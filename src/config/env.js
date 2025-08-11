import { z } from 'zod';

const envSchema = z.object({
  ZOHO_BASE_URL: z.string().url().default('https://www.zohoapis.com'),
  ZOHO_ACCOUNTS_URL: z.string().url().default('https://accounts.zoho.com'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
});

export const env = envSchema.parse(process.env);

// Ensure path segments start with a single leading slash.
// normalize('users') -> '/users' ; normalize('/users') -> '/users' ; normalize('') -> '/'
const normalize = (p = '') => {
  const s = String(p ?? '');
  if (s === '' || s === '/') return '/';
  return s.startsWith('/') ? s : `/${s}`;
};

const trim = str => str.replace(/\/$/, '');
const strip = str => str.replace(/^\//, '');

export function zohoUrl(path = '') {
  return `${trim(env.ZOHO_BASE_URL)}/${strip(path)}`;
}

export const zohoAccountsUrl = p =>
  new URL(normalize(p), env.ZOHO_ACCOUNTS_URL).toString();

// Convenience helper for Zoho CRM v2 endpoints
export const crmUrl = p => {
  const path = p.startsWith('/') ? p : `/${p}`;
  return zohoUrl(`/crm/v2${path}`);
};
