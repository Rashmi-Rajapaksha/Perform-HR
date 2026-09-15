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
