import { describe, it, expect } from 'vitest';
import { redactPII } from '../../src/utils/logger.js';

describe('redactPII', () => {
  it('redacts emails', () => {
    expect(redactPII('contact me at a@b.com')).toContain('[REDACTED_EMAIL]');
  });
  it('redacts phones', () => {
    expect(redactPII('Call +44 7700 900123')).toContain('[REDACTED_PHONE]');
  });
  it('redacts long numeric IDs', () => {
    expect(redactPII('Zoho id 1234567890123456')).toContain('[REDACTED_ID]');
  });
});
