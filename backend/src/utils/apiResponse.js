/**
 * Ensures every API response follows the required consistent shape:
 * { success, message, data }
 */
class ApiResponse {
  static success(res, { message = 'Success', data = {}, statusCode = 200, meta } = {}) {
    const body = { success: true, message, data };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static created(res, { message = 'Created successfully', data = {} } = {}) {
    return ApiResponse.success(res, { message, data, statusCode: 201 });
  }

  static error(res, { message = 'Something went wrong', statusCode = 500, errors = null } = {}) {
    const body = { success: false, message, data: {} };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  }
}

module.exports = ApiResponse;