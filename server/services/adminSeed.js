const Admin = require('../models/Admin');
const config = require('../config/env');

const DEFAULT_PASSWORD = 'ChangeMe123!';

/** Creates the first admin from .env if no admin with that username exists yet. Safe to call on every start. */
async function ensureAdmin() {
  const { username, email, password } = config.admin;
  if (await Admin.exists({ username })) return false;

  if (!password) {
    console.warn('[admin] No admin exists and ADMIN_PASSWORD is empty - set it in .env or run `npm run seed:admin`.');
    return false;
  }
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  if (config.isProd && password === DEFAULT_PASSWORD) {
    throw new Error('Refusing to create a production admin with the example password. Change ADMIN_PASSWORD in .env.');
  }

  await Admin.create({ username, email, password }); // hashed by the model's pre-save hook
  console.log(`[admin] Created admin "${username}"${password === DEFAULT_PASSWORD ? ' with the EXAMPLE password - change it!' : ''}`);
  return true;
}

module.exports = { ensureAdmin };
