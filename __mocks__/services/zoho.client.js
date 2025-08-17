/* eslint-disable no-unused-vars */
import { vi } from 'vitest';

export const searchAccountByExternalId = vi.fn(async (_token, externalId) => {
  if (externalId === 1) return null; // Simulate not found
  if (externalId === 2) return { id: 'existing-account-id' }; // Simulate found
  if (externalId === 3) return null; // Simulate retry scenario
  return null;
});

export const createAccount = vi.fn(async (_token, _fields) => {
  return { data: { id: 'new-account-id' } };
});

export const updateAccount = vi.fn(async (_token, _accountId, _fields) => {
  return { success: true };
});

export default {
  searchAccountByExternalId,
  createAccount,
  updateAccount,
};
