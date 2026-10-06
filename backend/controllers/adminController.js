const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');
const { ORDER_STATUS, DELIVERY_STATUS } = require('../config/constants');
const { recordAudit } = require('../utils/auditLog');

/**
 * @desc    Admin dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalFarmers,
    totalBuyers,
    totalDelivery,
    totalProducts,
    totalOrders,
    completedDeliveries,
    salesAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'farmer' }),
    User.countDocuments({ role: 'buyer' }),
    User.countDocuments({ role: 'delivery' }),
    Product.countDocuments(),
    Order.countDocuments(),
    Delivery.countDocuments({ status: DELIVERY_STATUS.DELIVERED }),
    Order.aggregate([
      { $match: { status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalDelivery,
      totalProducts,
      totalOrders,
      completedDeliveries,
      totalSales: salesAgg[0]?.total || 0,
    },
  });
});

/**
 * @desc    Get all users (optionally filtered by role)
 * @route   GET /api/admin/users?role=farmer
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, search, kycStatus } = req.query;
  const query = {};
  if (role && role !== 'All') query.role = role;
  if (kycStatus && kycStatus !== 'All') {
    query.kycStatus = kycStatus === 'not_submitted' ? { $in: ['not_submitted', null] } : kycStatus;
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  const users = await User.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

/**
 * @desc    Activate / deactivate a user
 * @route   PUT /api/admin/users/:id/toggle
 * @access  Private/Admin
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot deactivate an admin account');
  }
  user.isActive = !user.isActive;
  await user.save();
  recordAudit(req, user.isActive ? 'user.activated' : 'user.deactivated', 'User', user._id, `Role: ${user.role}`);
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
});

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot delete an admin account');
  }
  await user.deleteOne();
  recordAudit(req, 'user.deleted', 'User', user._id, `Role: ${user.role}; email: ${user.email}`);
  res.json({ success: true, message: 'User deleted' });
});

const reviewUserKyc = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body || {};
  if (!['verified', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('KYC review status must be verified or rejected');
  }
  if (status === 'rejected' && !String(note).trim()) {
    res.status(400);
    throw new Error('Add a reason so the user can correct and resubmit their verification');
  }
  const user = await User.findOne({ _id: req.params.id, role: { $in: ['farmer', 'buyer', 'delivery'] } });
  if (!user) {
    res.status(404);
    throw new Error('Eligible KYC account not found');
  }
  if (!user.kycSubmittedAt || user.kycStatus !== 'pending') {
    res.status(400);
    throw new Error('This account has no pending verification request');
  }
  if (status === 'verified' && (!user.kycDocumentType || !user.kycLastFour || !user.kycSupportingDocumentType || !user.kycSupportingLastFour || !user.kycConsentAt)) {
    res.status(400);
    throw new Error('This request is missing the required KYC details. Ask the user to resubmit their information.');
  }
  user.kycStatus = status;
  user.kycReviewedAt = new Date();
  user.kycReviewNote = String(note).trim().slice(0, 500);
  await user.save();
  recordAudit(req, `${user.role}.kyc.${status}`, 'User', user._id, user.kycReviewNote);
  await createNotification({
    user: user._id,
    title: status === 'verified' ? 'Account verification approved' : 'Verification needs an update',
    message: status === 'verified' ? 'Your account is verified and eligible for role-specific marketplace features.' : user.kycReviewNote,
    type: 'system',
    link: `/${user.role}/profile`,
    meta: { kind: 'kyc_review', status },
  });
  res.json({ success: true, message: `${user.role} KYC ${status}`, data: user });
});

const toggleFeaturedFarmer = asyncHandler(async (req, res) => {
  const farmer = await User.findOne({ _id: req.params.id, role: 'farmer' });
  if (!farmer) {
    res.status(404);
    throw new Error('Farmer not found');
  }
  if (req.body?.featured && farmer.kycStatus !== 'verified') {
    res.status(400);
    throw new Error('Only verified farmers can be featured');
  }
  farmer.isFeatured = Boolean(req.body?.featured);
  await farmer.save();
  recordAudit(req, farmer.isFeatured ? 'farmer.featured' : 'farmer.unfeatured', 'User', farmer._id);
  res.json({ success: true, data: farmer });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.action) filter.action = { $regex: String(req.query.action).slice(0, 80), $options: 'i' };
  const logs = await AuditLog.find(filter).populate('actor', 'name email role').sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, data: logs });
});

const csvCell = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const exportOrdersCsv = asyncHandler(async (_req, res) => {
  const orders = await Order.find().populate('buyer', 'name email phone').populate('farmer', 'name farmName').sort({ createdAt: -1 }).limit(20000).lean();
  const columns = ['Order Number', 'Created At', 'Buyer', 'Buyer Email', 'Buyer Phone', 'Farmer', 'Status', 'Payment Status', 'Subtotal INR', 'Delivery Fee INR', 'Total INR'];
  const rows = orders.map((order) => [
    order.orderNumber, order.createdAt?.toISOString(), order.buyer?.name, order.buyer?.email, order.buyer?.phone,
    order.farmer?.farmName || order.farmer?.name, order.status, order.paymentStatus,
    order.totalAmount, order.deliveryFee, order.grandTotal,
  ]);
  const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="agriconnect-orders.csv"');
  res.send(`\uFEFF${csv}`);
});

/**
 * @desc    Charts data: orders over time, sales over time, products by
 *          category, user distribution, order status distribution.
 * @route   GET /api/admin/charts
 * @access  Private/Admin
 */
const getCharts = asyncHandler(async (req, res) => {
  // Orders + sales over the last 14 days.
  const days = 14;
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const ordersOverTime = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        sales: { $sum: '$grandTotal' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill missing days with zeros so the chart is continuous.
  const timeline = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const found = ordersOverTime.find((o) => o._id === key);
    timeline.push({
      date: key,
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      orders: found ? found.orders : 0,
      sales: found ? found.sales : 0,
    });
  }

  const productsByCategory = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const userDistribution = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);

  const orderStatusDistribution = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      ordersOverTime: timeline,
      productsByCategory: productsByCategory.map((c) => ({ category: c._id, count: c.count })),
      userDistribution: userDistribution.map((u) => ({ role: u._id, count: u.count })),
      orderStatusDistribution: orderStatusDistribution.map((o) => ({ status: o._id, count: o.count })),
    },
  });
});

module.exports = {
  getStats, getUsers, toggleUserStatus, deleteUser, getCharts,
  reviewUserKyc, toggleFeaturedFarmer, getAuditLogs, exportOrdersCsv,
};
