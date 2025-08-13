// src/logger.js
import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level,
  base: undefined, // keep logs small
  redact: {
    paths: [
      'req.headers.authorization',
      '*.access_token',
      '*.refresh_token',
      '*.code',
    ],
    censor: '[REDACTED]',
  },
});
export default logger;
