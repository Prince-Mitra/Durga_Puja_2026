const multer = require('multer');
const mongoose = require('mongoose');
const { ZodError } = require('zod');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));

const send = (res, status, code, message, extra = {}) =>
  res.status(status).json({ error: { code, message }, ...extra });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) return send(res, err.status, err.code, err.message, err.extra);

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ field: issue.path.join('.') || undefined, message: issue.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: details[0]?.message || 'Invalid input', details },
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return send(res, 413, 'FILE_TOO_LARGE', 'That file is too large.');
    return send(res, 400, 'UPLOAD_ERROR', err.message);
  }

  if (err instanceof mongoose.Error.ValidationError) return send(res, 400, 'VALIDATION_ERROR', err.message);
  if (err instanceof mongoose.Error.CastError) return send(res, 400, 'BAD_REQUEST', 'Invalid identifier');
  if (err.code === 11000) return send(res, 409, 'DUPLICATE', 'That already exists.');
  if (err.type === 'entity.parse.failed') return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON.');
  if (err.type === 'entity.too.large') return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  if (err.message === 'Not allowed by CORS') return send(res, 403, 'CORS_BLOCKED', 'Origin not allowed.');

  console.error('[error]', err);
  return send(res, 500, 'INTERNAL_ERROR', config.isProd ? 'Something went wrong.' : err.message);
}

module.exports = { notFound, errorHandler };
