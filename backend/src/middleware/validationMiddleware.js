const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Runs after an express-validator chain (defined in src/validators/*).
 * Collects any validation errors into the standard API error response
 * shape instead of letting them reach the controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, {
      message: 'Validation failed',
      statusCode: 422,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
};

module.exports = { validate };