const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const ApiResponse = require('../utils/apiResponse');
const { User, Role } = require('../models');

/**
 * Verifies the JWT bearer token, loads the current user (with role), and
 * attaches it to req.user. Every protected route passes through this
 * before permissionMiddleware or the controller.
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return ApiResponse.error(res, { message: 'Authentication token missing', statusCode: 401 });
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      return ApiResponse.error(res, { message: 'Invalid or expired token', statusCode: 401 });
    }

    const user = await User.findByPk(payload.sub, {
      include: [{ model: Role, as: 'role' }],
    });

    if (!user || !user.is_active) {
      return ApiResponse.error(res, { message: 'Account not found or deactivated', statusCode: 401 });
    }

    req.user = user;
    req.userId = user.id;
    return next();
  } catch (error) {
    return next(error);
  }
};

/** Restricts a route to a fixed list of role names. */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return ApiResponse.error(res, { message: 'Not authenticated', statusCode: 401 });
  }
  if (!allowedRoles.includes(req.user.role.name)) {
    return ApiResponse.error(res, { message: 'Insufficient role privileges', statusCode: 403 });
  }
  return next();
};