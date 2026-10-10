const config = require('../../config/env');

/**
 * Storage abstraction. To add a provider:
 *   1. create services/storage/s3Driver.js (or cloudinaryDriver.js) exporting the same interface as localDriver.js
 *   2. register it below
 *   3. set STORAGE_DRIVER=s3 in .env
 * Nothing else in the codebase touches the file system or provider SDKs directly.
 */
const drivers = {
  local: () => require('./localDriver'),
  // s3: () => require('./s3Driver'),
  // cloudinary: () => require('./cloudinaryDriver'),
};

const load = drivers[config.storage.driver];
if (!load) {
  throw new Error(`Unknown STORAGE_DRIVER "${config.storage.driver}". Available: ${Object.keys(drivers).join(', ')}`);
}

module.exports = load();
