import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { logger, redactPII } from '../utils/logger.js';

export const loggingMiddleware = pinoHttp({
  logger,
  genReqId: req => req.headers['x-request-id'] || uuidv4(),
  customProps: (req, res) => ({
    requestId: req.id,
  }),
  customLogLevel: (req, res, err) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: redactPII(req.url),
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
