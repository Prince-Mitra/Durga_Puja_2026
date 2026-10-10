/**
 * Error with an HTTP status and a machine-readable code.
 * `extra` is merged into the JSON body (used e.g. to return the current lock state on 409).
 */
class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }

  static badRequest(message, extra) {
    return new ApiError(400, 'BAD_REQUEST', message, extra);
  }
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message);
  }
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  }
  static notFound(message = 'Not found', code = 'NOT_FOUND') {
    return new ApiError(404, code, message);
  }
  static conflict(code, message, extra) {
    return new ApiError(409, code, message, extra);
  }
}

module.exports = ApiError;
