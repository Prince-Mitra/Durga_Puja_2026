const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// If MongoDB drops after startup, answer with a clean 503 instead of letting queries hang for 10s.
module.exports = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is temporarily unavailable. Please try again in a moment.'));
  }
  return next();
};
