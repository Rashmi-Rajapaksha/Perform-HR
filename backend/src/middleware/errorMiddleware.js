const env = require('../config/environment');
const ApiResponse = require('../utils/apiResponse');

/** 404 handler - placed after all routes are mounted. */
const notFound = (req, res, next) => {
  ApiResponse.error(res, { message: `Route not found: ${req.method} ${req.originalUrl}`, statusCode: 404 });
};

/**
 * Centralized error handler. All controllers/services should throw plain
 * Errors (optionally with a `.statusCode`) or pass them to next(); nothing
 * else in the app should send its own 500 response directly.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);

  const statusCode = err.statusCode || (err.name === 'SequelizeValidationError' ? 422 : 500);

  let message = err.message || 'Internal server error';
  let errors = null;

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    errors = err.errors?.map((e) => ({ field: e.path, message: e.message }));
    message = 'Validation failed';
  }

  return ApiResponse.error(res, {
    message,
    statusCode,
    errors: errors || (env.env === 'development' ? { stack: err.stack } : null),
  });
};

module.exports = { notFound, errorHandler };