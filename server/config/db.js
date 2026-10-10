const mongoose = require('mongoose');
const config = require('./env');

mongoose.set('strictQuery', true);
// Never let a request body turn into a Mongo operator ($where, $gt ...) by accident.
mongoose.set('sanitizeFilter', true);

async function connectDB(uri = config.mongoUri) {
  mongoose.connection.on('disconnected', () => console.warn('[mongo] disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[mongo] reconnected'));
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[mongo] connected');
  } catch (error) {
    console.error(`[mongo] Could not connect: ${error.message}`);
    console.error('        Check MONGO_URI in your .env and that MongoDB is running.');
    throw error;
  }
}

module.exports = connectDB;
