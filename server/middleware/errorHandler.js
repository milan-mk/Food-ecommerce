const { ZodError } = require('zod');
const { isProd } = require('../config/env');

// Normalises every error into { success:false, message, errors? } with a safe status code.
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err instanceof ZodError) {
    status = 422;
    message = 'Validation failed';
    errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err.name === 'ValidationError' && err.errors) { // mongoose
    status = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Session invalid or expired. Please log in again.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) {
    // In tests, failures a test triggers on purpose (they carry an explicit status code) are not logged; surprises still are.
    if (!(process.env.NODE_ENV === 'test' && err.statusCode)) console.error(err);
    if (isProd) message = 'Something went wrong. Please try again later.';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (!isProd && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
};
