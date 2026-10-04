const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['order', 'product', 'user'], required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['open', 'investigating', 'resolved', 'dismissed'], default: 'open', index: true },
  adminNote: { type: String, default: '', maxlength: 2000 },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
