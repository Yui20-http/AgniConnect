const AuditLog = require('../models/AuditLog');

const recordAudit = (req, action, targetType = '', targetId = '', details = '') =>
  AuditLog.create({
    actor: req.user?._id || null,
    action,
    targetType,
    targetId: String(targetId || ''),
    details: String(details || '').slice(0, 1000),
    ipAddress: String(req.ip || '').slice(0, 80),
  }).catch((error) => console.error('Audit log write failed:', error.message));

module.exports = { recordAudit };
