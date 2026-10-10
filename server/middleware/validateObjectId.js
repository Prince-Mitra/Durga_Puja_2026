const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// router.param('id', validateObjectId) -> every :id is a well-formed ObjectId before any controller runs.
module.exports = (req, res, next, value) => {
  if (!mongoose.isValidObjectId(value) || String(value).length !== 24) return next(ApiError.notFound('Game not found'));
  return next();
};
