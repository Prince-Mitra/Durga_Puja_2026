const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/env');

const root = config.storage.uploadDir;
const tmpDir = path.join(root, '.tmp');

/**
 * Local-disk storage driver.
 *
 * Every driver implements the same small interface, so Cloudinary / S3 can be dropped in later:
 *   init()                      prepare the backend (create folders, check credentials ...)
 *   tempDir                     where multer first writes the incoming file
 *   save(file)  -> { key }      persist a temp file; file = { path, ext, mimeType, size, originalName }
 *   getUrl(key) -> string       public URL for a stored object
 *   exists(key) -> boolean
 *   remove(key)                 delete (must never throw if the object is already gone)
 *   removeTemp(path)            clean up a rejected upload
 */
const KEY_PATTERN = /^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/;

async function init() {
  await fsp.mkdir(tmpDir, { recursive: true });
}

async function save(file) {
  const key = `${crypto.randomUUID()}${file.ext}`;
  const target = path.join(root, key);
  try {
    await fsp.rename(file.path, target);
  } catch (error) {
    // rename fails across devices (e.g. tmp on another volume) -> copy then delete.
    if (error.code !== 'EXDEV') throw error;
    await fsp.copyFile(file.path, target);
    await fsp.unlink(file.path).catch(() => {});
  }
  return { key };
}

function getUrl(key) {
  return `${config.storage.publicBaseUrl}/uploads/${key}`;
}

async function exists(key) {
  if (!KEY_PATTERN.test(key)) return false;
  try {
    await fsp.access(path.join(root, key), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function remove(key) {
  if (!KEY_PATTERN.test(key)) return; // never build a path from untrusted input
  await fsp.unlink(path.join(root, key)).catch((error) => {
    if (error.code !== 'ENOENT') console.warn(`[storage] could not delete ${key}: ${error.message}`);
  });
}

async function removeTemp(filePath) {
  if (filePath) await fsp.unlink(filePath).catch(() => {});
}

module.exports = { init, tempDir: tmpDir, save, getUrl, exists, remove, removeTemp, KEY_PATTERN };
