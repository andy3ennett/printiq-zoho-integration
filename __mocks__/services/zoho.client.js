import { vi } from 'vitest';
/* eslint-disable no-unused-vars */

export const searchAccountByExternalId = vi.fn(async (token, externalId) => {
  if (externalId === 1) return null; // Simulate not found
  if (externalId === 2) return { id: 'existing-account-id' }; // Simulate found
  if (externalId === 3) return null; // Simulate retry scenario
  return null;
});

export const createAccount = vi.fn(async (token, fields) => {
  return { data: { id: 'new-account-id' } };
});

export const updateAccount = vi.fn(async (token, accountId, fields) => {
  return { success: true };
});

export default {
  searchAccountByExternalId,
  createAccount,
  updateAccount,
};
