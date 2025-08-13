import pino from 'pino';

/** Very lightweight PII redaction */
export function redactPII(value) {
  if (!value) return value;
  let s = String(value);

  // redact emails
  s = s.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    '[REDACTED_EMAIL]'
  );
  // redact long numeric IDs (do this BEFORE phones)
  s = s.replace(/\b\d{12,}\b/g, '[REDACTED_ID]');
  // redact phone-like sequences (simple heuristic)
  s = s.replace(/\+?\d[\d\s\-().]{7,}\d/g, '[REDACTED_PHONE]');
  return s;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  formatters: {
    log(obj) {
      // run redaction pass on string-ish fields we commonly log
      const out = { ...obj };
      for (const k of ['msg', 'error', 'path', 'method']) {
        if (out[k]) out[k] = redactPII(out[k]);
      }
      return out;
    },
  },
});
