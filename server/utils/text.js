const crypto = require('crypto');

// Strips control characters and collapses whitespace; keeps emoji/letters from any language.
function cleanName(raw, fallback) {
  const value = String(raw ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
  return value || fallback;
}

const newId = () => crypto.randomUUID();

module.exports = { cleanName, newId };
