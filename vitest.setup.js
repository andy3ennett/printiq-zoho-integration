const originalError = console.error;
const originalWarn = console.warn;

// Only suppress API-related logs
const suppressPatterns = [
  'Error upserting Zoho',
  '❌',
  'Invalid URL',
  'Zoho API failure',
  'Contact webhook sync failed',
];

function shouldSuppress(message) {
  return suppressPatterns.some(pattern => message.toString().includes(pattern));
}

console.error = (...args) => {
  if (!shouldSuppress(args[0])) {
    originalError(...args);
  }
};

console.warn = (...args) => {
  if (!shouldSuppress(args[0])) {
    originalWarn(...args);
  }
};
