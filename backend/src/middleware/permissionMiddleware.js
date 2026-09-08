const ApiResponse = require('../utils/apiResponse');
const { Role, Permission } = require('../models');

/**
 * Permission-based authorization, layered on top of role-based auth.
 * A role's permission set is resolved from role_permissions each time
 * (small table, cheap query) rather than cached in the JWT, so that
 * revoking a permission from a role takes effect immediately without
 * forcing a re-login.
 *
 * Usage: router.get('/x', authenticate, requirePermission('EMPLOYEE_VIEW'), controller)
 * Pass multiple codes to require ANY ONE of them (OR semantics).
 */
const requirePermission = (...requiredCodes) => async (req, res, next) => {
  try {
    if (!req.user || !req.user.role_id) {
      return ApiResponse.error(res, { message: 'Not authenticated', statusCode: 401 });
    }

    const role = await Role.findByPk(req.user.role_id, {
      include: [{ model: Permission, as: 'permissions', attributes: ['code'] }],
    });

    const grantedCodes = new Set((role?.permissions || []).map((p) => p.code));
    const hasAccess = requiredCodes.some((code) => grantedCodes.has(code));

    if (!hasAccess) {
      return ApiResponse.error(res, {
        message: 'You do not have permission to perform this action',
        statusCode: 403,
      });
    }

    req.userPermissions = grantedCodes;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requirePermission };