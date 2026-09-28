const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');
const { emitToUser, emitToAll } = require('../utils/socket');
const { ORDER_STATUS, DELIVERY_FEE, DELIVERY_STATUS, PLATFORM_COMMISSION_RATE } = require('../config/constants');
const { geocodeLocation } = require('../utils/geo');
const { calculateTieredUnitPrice, calculatePayoutBreakdown } = require('../utils/commerce');

/**
 * @desc    Place an order from the buyer's cart.
 *          The cart is grouped by farmer, so one checkout can create several
 *          orders (one per farmer). Each order decrements product stock.
 * @route   POST /api/orders
 * @access  Private/Buyer
 */
const createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress, deliveryLocation, paymentMethod, notes, paymentReference } = req.body;

  if (!deliveryAddress) {
    res.status(400);
    throw new Error('Delivery address is required');
  }

  const cart = await Cart.findOne({ buyer: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('Your cart is empty');
  }

  // Validate stock first (fail fast before creating anything).
  for (const item of cart.items) {
    if (!item.product) continue;
    if (!item.product.isAvailable) {
      res.status(400);
      throw new Error(`${item.product.name} is no longer available`);
    }
    if (item.quantity > item.product.quantity) {
      res.status(400);
      throw new Error(`Only ${item.product.quantity} ${item.product.unit} of ${item.product.name} available`);
    }
  }

  // Group cart items by farmer.
  const groups = {};
  cart.items.forEach((item) => {
    if (!item.product) return;
    const farmerId = String(item.product.farmer);
    if (!groups[farmerId]) groups[farmerId] = [];
    groups[farmerId].push(item);
  });

  const createdOrders = [];

  for (const farmerId of Object.keys(groups)) {
    const groupItems = groups[farmerId];

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of groupItems) {
      const product = item.product;
      const effectivePrice = calculateTieredUnitPrice(product, item.quantity);
      const lineTotal = effectivePrice * item.quantity;
      subtotal += lineTotal;
      orderItemsData.push({
        product: product._id,
        farmer: product.farmer,
        name: product.name,
        image: product.image,
        unit: product.unit,
        quantity: item.quantity,
        pricePerUnit: effectivePrice,
        subtotal: lineTotal,
      });
    }

    const deliveryFee = DELIVERY_FEE;
    const grandTotal = subtotal + deliveryFee;
    const normalizedPaymentMethod = paymentMethod || 'Cash on Delivery';
    const paymentStatus = /online/i.test(normalizedPaymentMethod) || paymentReference ? 'Paid' : 'Pending';
    const payoutBreakdown = calculatePayoutBreakdown(subtotal, PLATFORM_COMMISSION_RATE);

    const farmer = await User.findById(farmerId);

    const pickupLocation = farmer?.farmLocation || farmer?.location || 'Farm';
    const dropLocation = deliveryLocation || deliveryAddress;

    // Derive approximate coordinates so the tracking map can render a route.
    const pickupCoords = geocodeLocation(pickupLocation);
    const dropCoords = geocodeLocation(dropLocation);

    const order = await Order.create({
      buyer: req.user._id,
      farmer: farmerId,
      totalAmount: subtotal,
      deliveryFee,
      grandTotal,
      platformCommissionRate: PLATFORM_COMMISSION_RATE,
      commissionAmount: payoutBreakdown.platformCommission,
      farmerPayoutAmount: payoutBreakdown.farmerPayout,
      invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      deliveryAddress,
      deliveryLocation: dropLocation,
      pickupLocation,
      coordinates: {
        pickup: pickupCoords || { lat: null, lng: null },
        delivery: dropCoords || { lat: null, lng: null },
      },
      paymentMethod: normalizedPaymentMethod,
      paymentStatus,
      paymentReference: paymentReference || '',
      notes: notes || '',
      status: ORDER_STATUS.PENDING,
      statusHistory: [{ status: ORDER_STATUS.PENDING, note: 'Order placed by buyer' }],
    });

    // Create order items and decrement stock.
    for (const data of orderItemsData) {
      const orderItem = await OrderItem.create({ ...data, order: order._id });
      order.items.push(orderItem._id);

      const product = await Product.findById(data.product);
      if (product) {
        product.quantity = Math.max(0, product.quantity - data.quantity);
        product.soldCount += data.quantity;
        if (product.quantity === 0) product.isAvailable = false;
        await product.save();

        // Low stock notification to the farmer.
        if (product.quantity > 0 && product.quantity <= 10) {
          await createNotification({
            user: product.farmer,
            title: 'Low stock alert',
            message: `${product.name} is running low (${product.quantity} ${product.unit} left).`,
            type: 'stock',
            link: '/farmer/products',
          });
        }

        emitToAll('product:updated', { action: 'stock', productId: product._id, quantity: product.quantity });
      }
    }

    await order.save();

    // Notify the farmer in real time.
    await createNotification({
      user: farmerId,
      title: 'New order received',
      message: `You received a new order ${order.orderNumber} worth ₹${grandTotal}.`,
      type: 'order',
      link: '/farmer/orders',
      meta: { orderId: order._id },
    });
    emitToUser(farmerId, 'order:new', order);

    createdOrders.push(order);
  }

  // Empty the cart.
  cart.items = [];
  await cart.save();

  res.status(201).json({
    success: true,
    message: `${createdOrders.length} order(s) placed successfully`,
    data: createdOrders,
  });
});

/**
 * @desc    Get orders for the logged-in user (role aware)
 * @route   GET /api/orders
 * @access  Private
 */
const getOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = {};

  if (req.user.role === 'buyer') query.buyer = req.user._id;
  else if (req.user.role === 'farmer') query.farmer = req.user._id;
  else if (req.user.role === 'delivery') query.deliveryPartner = req.user._id;
  // admin sees all

  if (status && status !== 'All') query.status = status;

  const orders = await Order.find(query)
    .populate('buyer', 'name email phone address location')
    .populate('farmer', 'name farmName farmLocation location phone')
    .populate('deliveryPartner', 'name phone vehicleType vehicleNumber')
    .populate({ path: 'items', populate: { path: 'product', select: 'name image unit' } })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: orders });
});

/**
 * @desc    Get a single order
 * @route   GET /api/orders/:id
 * @access  Private (owner, assigned delivery partner or admin)
 */
const getOrderTimeline = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('orderNumber status statusHistory createdAt');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const timeline = [...(order.statusHistory || [])].sort((a, b) => new Date(a.at || a.createdAt) - new Date(b.at || b.createdAt));
  res.json({ success: true, data: { orderNumber: order.orderNumber, status: order.status, statusHistory: timeline } });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer', 'name email phone address location')
    .populate('farmer', 'name farmName farmLocation location phone profileImage')
    .populate('deliveryPartner', 'name phone vehicleType vehicleNumber')
    .populate({ path: 'items', populate: { path: 'product', select: 'name image unit category' } });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner =
    String(order.buyer._id) === String(req.user._id) ||
    String(order.farmer._id) === String(req.user._id) ||
    (order.deliveryPartner && String(order.deliveryPartner._id) === String(req.user._id)) ||
    req.user.role === 'admin';

  if (!isOwner) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json({ success: true, data: order });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const userIsBuyer = String(order.buyer) === String(req.user._id);
  const userIsAdmin = req.user.role === 'admin';
  if (!userIsBuyer && !userIsAdmin) {
    res.status(403);
    throw new Error('Only the buyer or admin can cancel this order');
  }

  const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PROCESSING];
  if (!cancellableStatuses.includes(order.status)) {
    res.status(400);
    throw new Error('This order can no longer be cancelled. Refunds are available only before dispatch.');
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelReason = req.body?.reason || 'Buyer requested cancellation';
  order.refundStatus = 'Requested';
  order.refundAmount = Number(order.grandTotal || 0);
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    note: order.cancelReason,
    at: new Date(),
  });
  await order.save();

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      orderId: order._id,
      refundAmount: order.refundAmount,
      refundStatus: order.refundStatus,
      policy: 'Orders cancelled before dispatch are refunded in full.',
    },
  });
});

/**
 * @desc    Update order status (farmer / delivery / admin)
 * @route   PUT /api/orders/:id/status
 * @access  Private
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const allowedStatuses = Object.values(ORDER_STATUS);
  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid order status');
  }

  // Permission checks.
  const isFarmer = String(order.farmer) === String(req.user._id);
  const isDelivery = order.deliveryPartner && String(order.deliveryPartner) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  const isBuyer = String(order.buyer) === String(req.user._id);

  if (!isFarmer && !isDelivery && !isAdmin && !isBuyer) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  // Buyers may only cancel, and only while the order is still Pending/Accepted.
  if (isBuyer && !isAdmin) {
    if (status !== ORDER_STATUS.CANCELLED) {
      res.status(403);
      throw new Error('Buyers can only cancel orders');
    }
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED].includes(order.status)) {
      res.status(400);
      throw new Error('Order can no longer be cancelled');
    }
  }

  order.status = status;
  order.statusHistory.push({ status, note: note || `Status changed to ${status}` });

  if (status === ORDER_STATUS.DELIVERED) {
    order.deliveredAt = new Date();
    order.paymentStatus = 'Paid';
  }

  if (status === ORDER_STATUS.CANCELLED) {
    order.cancelReason = note || 'Cancelled';
    // Restock products when an order is cancelled.
    const items = await OrderItem.find({ order: order._id });
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        product.soldCount = Math.max(0, product.soldCount - item.quantity);
        product.isAvailable = true;
        await product.save();
        emitToAll('product:updated', { action: 'restock', productId: product._id, quantity: product.quantity });
      }
    }
  }

  await order.save();

  // When the farmer marks the order ready for pickup, create a delivery record.
  if (status === ORDER_STATUS.READY_FOR_PICKUP) {
    const existing = await Delivery.findOne({ order: order._id });
    if (!existing) {
      await Delivery.create({
        order: order._id,
        farmer: order.farmer,
        buyer: order.buyer,
        pickupLocation: order.pickupLocation,
        deliveryLocation: order.deliveryLocation,
        coordinates: order.coordinates,
        status: DELIVERY_STATUS.ASSIGNED,
        statusHistory: [{ status: DELIVERY_STATUS.ASSIGNED, note: 'Awaiting delivery partner assignment' }],
      });
    }
  }

  // Keep the linked delivery record in sync.
  const delivery = await Delivery.findOne({ order: order._id });
  if (delivery) {
    const map = {
      [ORDER_STATUS.PICKED_UP]: DELIVERY_STATUS.PICKED_UP,
      [ORDER_STATUS.IN_TRANSIT]: DELIVERY_STATUS.IN_TRANSIT,
      [ORDER_STATUS.DELIVERED]: DELIVERY_STATUS.DELIVERED,
    };
    if (map[status]) {
      delivery.status = map[status];
      delivery.statusHistory.push({ status: map[status], note: `Order ${status}` });
      if (status === ORDER_STATUS.DELIVERED) delivery.completedAt = new Date();
      await delivery.save();
    }
  }

  // Notify the buyer (and farmer) in real time.
  const populated = await Order.findById(order._id)
    .populate('buyer', 'name email phone')
    .populate('farmer', 'name farmName')
    .populate('deliveryPartner', 'name phone')
    .populate({ path: 'items', populate: { path: 'product', select: 'name image unit' } });

  await createNotification({
    user: order.buyer,
    title: `Order ${status}`,
    message: `Your order ${order.orderNumber} is now "${status}".`,
    type: 'order',
    link: `/buyer/orders/${order._id}`,
    meta: { orderId: order._id },
  });
  emitToUser(order.buyer, 'order:updated', populated);

  if (String(order.farmer) !== String(req.user._id)) {
    emitToUser(order.farmer, 'order:updated', populated);
  }
  if (order.deliveryPartner) {
    emitToUser(order.deliveryPartner, 'order:updated', populated);
  }

  res.json({ success: true, message: `Order marked as ${status}`, data: populated });
});

/**
 * @desc    Get order statistics for the logged-in farmer
 * @route   GET /api/orders/farmer/stats
 * @access  Private/Farmer
 */
const getFarmerStats = asyncHandler(async (req, res) => {
  const farmerId = req.user._id;
  const [total, pending, completed, salesAgg] = await Promise.all([
    Order.countDocuments({ farmer: farmerId }),
    Order.countDocuments({ farmer: farmerId, status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PROCESSING] } }),
    Order.countDocuments({ farmer: farmerId, status: ORDER_STATUS.DELIVERED }),
    Order.aggregate([
      { $match: { farmer: farmerId, status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
  ]);

  const products = await Product.countDocuments({ farmer: farmerId });
  const activeListings = await Product.countDocuments({ farmer: farmerId, isAvailable: true });

  res.json({
    success: true,
    data: {
      totalProducts: products,
      activeListings,
      pendingOrders: pending,
      completedOrders: completed,
      totalSales: salesAgg[0]?.total || 0,
      totalOrders: total,
    },
  });
});

/**
 * @desc    Get order statistics for the logged-in buyer
 * @route   GET /api/orders/buyer/stats
 * @access  Private/Buyer
 */
const getBuyerStats = asyncHandler(async (req, res) => {
  const buyerId = req.user._id;
  const [total, active, completed, spendAgg] = await Promise.all([
    Order.countDocuments({ buyer: buyerId }),
    Order.countDocuments({ buyer: buyerId, status: { $nin: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED] } }),
    Order.countDocuments({ buyer: buyerId, status: ORDER_STATUS.DELIVERED }),
    Order.aggregate([
      { $match: { buyer: buyerId, status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalOrders: total,
      activeOrders: active,
      completedOrders: completed,
      totalSpent: spendAgg[0]?.total || 0,
    },
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrderTimeline,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getFarmerStats,
  getBuyerStats,
};
