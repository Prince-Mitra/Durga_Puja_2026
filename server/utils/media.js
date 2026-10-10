const path = require('path');
const config = require('../config/env');

/** Allowed uploads: extension -> kind + accepted MIME types. Both must match. */
const RULES = {
  '.jpg': { kind: 'image', mimes: ['image/jpeg'] },
  '.jpeg': { kind: 'image', mimes: ['image/jpeg'] },
  '.png': { kind: 'image', mimes: ['image/png'] },
  '.webp': { kind: 'image', mimes: ['image/webp'] },
  '.gif': { kind: 'image', mimes: ['image/gif'] },
  '.mp4': { kind: 'video', mimes: ['video/mp4'] },
  '.webm': { kind: 'video', mimes: ['video/webm'] },
  '.mov': { kind: 'video', mimes: ['video/quicktime'] },
  '.mp3': { kind: 'audio', mimes: ['audio/mpeg', 'audio/mp3'] },
  '.wav': { kind: 'audio', mimes: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] },
  '.m4a': { kind: 'audio', mimes: ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac'] },
};

const MAX_BYTES = {
  image: () => config.limits.imageBytes,
  audio: () => config.limits.audioBytes,
  video: () => config.limits.videoBytes,
};

/** Returns { kind, ext } for an acceptable file, or null. */
function classifyFile(originalName = '', mimeType = '') {
  const ext = path.extname(originalName).toLowerCase();
  const rule = RULES[ext];
  if (!rule || !rule.mimes.includes(String(mimeType).toLowerCase())) return null;
  return { kind: rule.kind, ext };
}

const kindFromKey = (key) => (RULES[path.extname(key).toLowerCase()] || {}).kind || null;
const maxBytesFor = (kind) => (MAX_BYTES[kind] ? MAX_BYTES[kind]() : 0);
const largestAllowedBytes = () => Math.max(...Object.values(MAX_BYTES).map((fn) => fn()));
const allowedExtensions = () => Object.keys(RULES).join(', ');

module.exports = { classifyFile, kindFromKey, maxBytesFor, largestAllowedBytes, allowedExtensions };
