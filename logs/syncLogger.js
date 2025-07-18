import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

export default {
  info: (...args) => logger.info(...args),
  warn: (...args) => logger.warn(...args),
  error: (...args) => logger.error(...args),
  log: (...args) => logger.info(...args),
  success: (...args) => logger.info(...args),
  logError: (...args) => logger.error(...args),
};
