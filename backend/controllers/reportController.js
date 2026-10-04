const Report = require('../models/Report');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { recordAudit } = require('../utils/auditLog');

const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body || {};
  if (!['order', 'product', 'user'].includes(targetType) || !targetId || !reason || !String(description || '').trim()) {
    res.status(400);
    throw new Error('Choose what to report and include a reason and description');
  }
  const Model = { order: Order, product: Product, user: User }[targetType];
  const target = await Model.findById(targetId);
  if (!target) {
    res.status(404);
    throw new Error('Reported item was not found');
  }
  if (targetType === 'order' && ![String(target.buyer), String(target.farmer)].includes(String(req.user._id))) {
    res.status(403);
    throw new Error('Only someone involved in this order can report it');
  }
  if (targetType === 'user' && String(target._id) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot report your own account');
  }
  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    targetId,
    reason: String(reason).trim().slice(0, 100),
    description: String(description).trim().slice(0, 2000),
  });
  res.status(201).json({ success: true, message: 'Report sent to the moderation team', data: report });
});

const getReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const reports = await Report.find(filter)
    .populate('reporter', 'name email role')
    .populate('resolvedBy', 'name email')
    .sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, data: reports });
});

const updateReport = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body || {};
  if (!['open', 'investigating', 'resolved', 'dismissed'].includes(status)) {
    res.status(400);
    throw new Error('Choose a valid report status');
  }
  const report = await Report.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }
  report.status = status;
  report.adminNote = String(adminNote || '').slice(0, 2000);
  report.resolvedBy = ['resolved', 'dismissed'].includes(status) ? req.user._id : null;
  report.resolvedAt = ['resolved', 'dismissed'].includes(status) ? new Date() : null;
  await report.save();
  recordAudit(req, 'report.updated', 'Report', report._id, `Status: ${status}`);
  res.json({ success: true, data: report });
});

module.exports = { createReport, getReports, updateReport };
