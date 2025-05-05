const winston = require('winston');
const path = require('path');

const syncLogger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/sync.log'),
    }),
  ],
});

const duplicateLogger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/duplicates.log'),
    }),
  ],
});

module.exports = {
  syncLogger,
  duplicateLogger,
};
