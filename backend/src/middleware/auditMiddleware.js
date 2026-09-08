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

module.exports = { authenticate, requireRole };



const { AuditLog } = require('../models');

/**
 * Fire-and-forget audit logging. Attach after a mutating route succeeds,
 * or call auditLog.record() directly from a service when the change
 * itself needs to carry more context than the middleware has access to.
 *
 * Usage as middleware (logs after res.json() has been sent):
 *   router.post('/employees', authenticate, auditMiddleware('CREATE', 'EMPLOYEE'), controller)
 *
 * Note: this wraps res.json so it can capture the created/updated entity
 * id from the standard { success, message, data } response body.
 */
const auditMiddleware = (action, module) => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (body && body.success) {
      const entityId = body.data?.id || req.params?.id || null;
      AuditLog.create({
        user_id: req.user?.id || null,
        action,
        module,
        entity_type: module,
        entity_id: entityId,
        old_values: req.auditOldValues || null,
        new_values: action === 'DELETE' ? null : req.body || null,
        ip_address: req.ip,
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[auditMiddleware] failed to write audit log:', err.message);
      });
    }
    return originalJson(body);
  };

  next();
};

/** Direct-call helper for use inside services where more context is known. */
async function recordAudit({ userId, action, module, entityType, entityId, oldValues, newValues, ipAddress }) {
  try {
    await AuditLog.create({
      user_id: userId || null,
      action,
      module,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: ipAddress || null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[recordAudit] failed to write audit log:', err.message);
  }
}

module.exports = { auditMiddleware, recordAudit };