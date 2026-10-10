// Wraps async route handlers so rejected promises reach the centralized error handler.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
