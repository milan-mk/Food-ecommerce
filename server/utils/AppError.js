class AppError extends Error {
  constructor(message, statusCode = 500, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
  static badRequest(m = 'Bad request', e) { return new AppError(m, 400, e); }
  static unauthorized(m = 'Not authenticated') { return new AppError(m, 401); }
  static forbidden(m = 'You do not have permission to do this') { return new AppError(m, 403); }
  static notFound(m = 'Resource not found') { return new AppError(m, 404); }
  static conflict(m = 'Resource already exists') { return new AppError(m, 409); }
  static unprocessable(m = 'Validation failed', e) { return new AppError(m, 422, e); }
}
module.exports = AppError;
