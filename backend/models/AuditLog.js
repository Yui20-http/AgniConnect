const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, trim: true, maxlength: 100 },
  targetType: { type: String, default: '', maxlength: 60 },
  targetId: { type: String, default: '', maxlength: 100, index: true },
  details: { type: String, default: '', maxlength: 1000 },
  ipAddress: { type: String, default: '', maxlength: 80 },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
