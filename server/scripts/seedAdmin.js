/* Creates (or resets the password of) the admin defined in .env.   Usage: npm run seed:admin */
const mongoose = require('mongoose');
const config = require('../config/env');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

(async () => {
  const { username, email, password } = config.admin;
  if (!password || password.length < 8) {
    console.error('Set ADMIN_PASSWORD (8+ characters) in .env first.');
    process.exit(1);
  }
  await connectDB();
  const existing = await Admin.findOne({ username }).select('+password');
  if (existing) {
    existing.password = password; // re-hashed by pre-save hook
    existing.email = email;
    await existing.save();
    console.log(`Updated admin "${username}" (password reset to the value in .env).`);
  } else {
    await Admin.create({ username, email, password });
    console.log(`Created admin "${username}".`);
  }
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
