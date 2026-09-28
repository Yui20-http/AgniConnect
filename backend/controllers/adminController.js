const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const asyncHandler = require('../utils/asyncHandler');
const { ORDER_STATUS, DELIVERY_STATUS } = require('../config/constants');

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
  const { role, search } = req.query;
  const query = {};
  if (role && role !== 'All') query.role = role;
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
  res.json({ success: true, message: 'User deleted' });
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

module.exports = { getStats, getUsers, toggleUserStatus, deleteUser, getCharts };
