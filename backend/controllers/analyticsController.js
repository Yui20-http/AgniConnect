const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ORDER_STATUS } = require('../config/constants');

/**
 * @desc  Farmer analytics dashboard data
 * @route GET /api/analytics/farmer
 * @access Private/Farmer
 */
const getFarmerAnalytics = asyncHandler(async (req, res) => {
  const farmerId = req.user._id;

  // ── 1. All delivered orders for this farmer ──────────────────────────────
  const deliveredOrders = await Order.find({
    farmer: farmerId,
    status: ORDER_STATUS.DELIVERED,
  })
    .populate('buyer', 'name')
    .lean();

  // ── 2. Revenue by month (last 12 months) ─────────────────────────────────
  const now = new Date();
  const revenueByMonth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      grossRevenue: 0,
      netRevenue: 0,
      orders: 0,
    };
  });

  for (const order of deliveredOrders) {
    const d = new Date(order.deliveredAt || order.updatedAt || order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = revenueByMonth.find((b) => b.key === key);
    if (bucket) {
      bucket.grossRevenue += Number(order.totalAmount || 0);
      bucket.netRevenue += Number(order.farmerPayoutAmount || order.totalAmount || 0);
      bucket.orders += 1;
    }
  }

  // ── 3. Top products by revenue (from OrderItems) ─────────────────────────
  const orderIds = deliveredOrders.map((o) => o._id);
  const items = orderIds.length
    ? await OrderItem.find({ order: { $in: orderIds } }).lean()
    : [];

  const productMap = {};
  for (const item of items) {
    const pid = String(item.product);
    if (!productMap[pid]) {
      productMap[pid] = { productId: pid, name: item.name, revenue: 0, unitsSold: 0 };
    }
    productMap[pid].revenue += Number(item.subtotal || 0);
    productMap[pid].unitsSold += Number(item.quantity || 0);
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ── 4. Repeat buyers ─────────────────────────────────────────────────────
  const buyerOrderCount = {};
  for (const order of deliveredOrders) {
    const id = String(order.buyer?._id || order.buyer);
    if (!buyerOrderCount[id]) {
      buyerOrderCount[id] = { buyerId: id, name: order.buyer?.name || 'Buyer', count: 0 };
    }
    buyerOrderCount[id].count += 1;
  }
  const repeatBuyers = Object.values(buyerOrderCount)
    .filter((b) => b.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── 5. Orders by status (all-time) ───────────────────────────────────────
  const statusCounts = await Order.aggregate([
    { $match: { farmer: farmerId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const ordersByStatus = statusCounts.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  // ── 6. Totals ─────────────────────────────────────────────────────────────
  const totalGross = deliveredOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const totalNet = deliveredOrders.reduce((s, o) => s + Number(o.farmerPayoutAmount || o.totalAmount || 0), 0);

  res.json({
    success: true,
    data: {
      revenueByMonth,
      topProducts,
      repeatBuyers,
      ordersByStatus,
      totals: {
        grossRevenue: totalGross,
        netRevenue: totalNet,
        deliveredOrders: deliveredOrders.length,
        repeatBuyerCount: repeatBuyers.length,
        uniqueBuyers: Object.keys(buyerOrderCount).length,
      },
    },
  });
});

module.exports = { getFarmerAnalytics };
