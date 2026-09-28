const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');
const { emitToUser } = require('../utils/socket');
const { DELIVERY_STATUS, ORDER_STATUS } = require('../config/constants');

/**
 * @desc    Get deliveries for the logged-in delivery partner
 * @route   GET /api/deliveries/my
 * @access  Private/Delivery
 */
const getMyDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await Delivery.find({ deliveryPartner: req.user._id })
    .populate('order', 'orderNumber grandTotal status items')
    .populate('farmer', 'name farmName farmLocation location phone')
    .populate('buyer', 'name phone address location')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: deliveries });
});

/**
 * @desc    Get all deliveries (admin)
 * @route   GET /api/deliveries
 * @access  Private/Admin
 */
const getAllDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await Delivery.find()
    .populate('order', 'orderNumber grandTotal status')
    .populate('farmer', 'name farmName farmLocation')
    .populate('buyer', 'name address location')
    .populate('deliveryPartner', 'name phone vehicleType vehicleNumber')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: deliveries });
});

/**
 * @desc    Get a single delivery by order id
 * @route   GET /api/deliveries/order/:orderId
 * @access  Private
 */
const getDeliveryByOrder = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findOne({ order: req.params.orderId })
    .populate('order', 'orderNumber grandTotal status items deliveryAddress pickupLocation')
    .populate('farmer', 'name farmName farmLocation location phone')
    .populate('buyer', 'name phone address location')
    .populate('deliveryPartner', 'name phone vehicleType vehicleNumber');
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery not found for this order');
  }
  res.json({ success: true, data: delivery });
});

/**
 * @desc    Assign a delivery partner to an order (admin)
 * @route   POST /api/deliveries/assign
 * @access  Private/Admin
 */
const assignDelivery = asyncHandler(async (req, res) => {
  const { orderId, deliveryPartnerId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isAdmin = req.user.role === 'admin';
  const isBuyer = req.user.role === 'buyer' && String(order.buyer) === String(req.user._id);

  if (!isAdmin && !isBuyer) {
    res.status(403);
    throw new Error('Not authorized to assign a delivery partner');
  }

  if (isBuyer && order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
    res.status(400);
    throw new Error('This order is not ready for pickup yet');
  }

  const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery' });
  if (!partner) {
    res.status(404);
    throw new Error('Delivery partner not found');
  }

  // Create the delivery record if it does not exist yet.
  let delivery = await Delivery.findOne({ order: orderId });
  if (!delivery) {
    delivery = await Delivery.create({
      order: orderId,
      farmer: order.farmer,
      buyer: order.buyer,
      pickupLocation: order.pickupLocation,
      deliveryLocation: order.deliveryLocation,
      coordinates: order.coordinates,
      status: DELIVERY_STATUS.ASSIGNED,
      statusHistory: [{ status: DELIVERY_STATUS.ASSIGNED, note: 'Delivery partner assigned' }],
    });
  }

  delivery.deliveryPartner = deliveryPartnerId;
  delivery.status = DELIVERY_STATUS.ASSIGNED;
  delivery.statusHistory.push({ status: DELIVERY_STATUS.ASSIGNED, note: `Assigned to ${partner.name}` });
  await delivery.save();

  order.deliveryPartner = deliveryPartnerId;
  // If the order was still pending/accepted, move it forward to ready for pickup.
  if ([ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PROCESSING].includes(order.status)) {
    order.status = ORDER_STATUS.READY_FOR_PICKUP;
    order.statusHistory.push({ status: ORDER_STATUS.READY_FOR_PICKUP, note: 'Delivery partner assigned' });
  }
  await order.save();

  // Notify the delivery partner.
  await createNotification({
    user: deliveryPartnerId,
    title: 'New delivery assigned',
    message: `You have been assigned order ${order.orderNumber}.`,
    type: 'delivery',
    link: '/delivery/deliveries',
    meta: { orderId: order._id },
  });
  emitToUser(deliveryPartnerId, 'delivery:assigned', delivery);

  // Notify the buyer.
  await createNotification({
    user: order.buyer,
    title: 'Delivery partner assigned',
    message: `${partner.name} will deliver your order ${order.orderNumber}.`,
    type: 'delivery',
    link: `/buyer/orders/${order._id}`,
    meta: { orderId: order._id },
  });
  emitToUser(order.buyer, 'delivery:updated', delivery);

  res.json({ success: true, message: 'Delivery partner assigned', data: delivery });
});

/**
 * @desc    Update delivery status (delivery partner)
 * @route   PUT /api/deliveries/:id/status
 * @access  Private/Delivery or Admin
 */
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery not found');
  }

  if (req.user.role !== 'admin' && String(delivery.deliveryPartner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to update this delivery');
  }

  if (!Object.values(DELIVERY_STATUS).includes(status)) {
    res.status(400);
    throw new Error('Invalid delivery status');
  }

  delivery.status = status;
  delivery.statusHistory.push({ status, note: note || `Marked as ${status}` });
  if (status === DELIVERY_STATUS.DELIVERED) delivery.completedAt = new Date();
  await delivery.save();

  // Keep the order in sync.
  const order = await Order.findById(delivery.order);
  if (order) {
    const map = {
      [DELIVERY_STATUS.PICKED_UP]: ORDER_STATUS.PICKED_UP,
      [DELIVERY_STATUS.IN_TRANSIT]: ORDER_STATUS.IN_TRANSIT,
      [DELIVERY_STATUS.DELIVERED]: ORDER_STATUS.DELIVERED,
    };
    if (map[status]) {
      order.status = map[status];
      order.statusHistory.push({ status: map[status], note: `Delivery ${status}` });
      if (status === DELIVERY_STATUS.DELIVERED) {
        order.deliveredAt = new Date();
        order.paymentStatus = 'Paid';
      }
      await order.save();
    }

    // Notify the buyer in real time.
    await createNotification({
      user: order.buyer,
      title: `Delivery ${status}`,
      message: `Your order ${order.orderNumber} delivery status: ${status}.`,
      type: 'delivery',
      link: `/buyer/orders/${order._id}`,
      meta: { orderId: order._id },
    });
    emitToUser(order.buyer, 'delivery:updated', delivery);
    emitToUser(order.farmer, 'delivery:updated', delivery);
  }

  res.json({ success: true, message: `Delivery marked as ${status}`, data: delivery });
});

/**
 * @desc    Delivery partner dashboard statistics
 * @route   GET /api/deliveries/stats
 * @access  Private/Delivery
 */
const getDeliveryStats = asyncHandler(async (req, res) => {
  const partnerId = req.user._id;
  const [assigned, pendingPickup, inTransit, completed] = await Promise.all([
    Delivery.countDocuments({ deliveryPartner: partnerId }),
    Delivery.countDocuments({ deliveryPartner: partnerId, status: DELIVERY_STATUS.ASSIGNED }),
    Delivery.countDocuments({ deliveryPartner: partnerId, status: { $in: [DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.IN_TRANSIT] } }),
    Delivery.countDocuments({ deliveryPartner: partnerId, status: DELIVERY_STATUS.DELIVERED }),
  ]);

  res.json({
    success: true,
    data: { assignedDeliveries: assigned, pendingPickup, inTransit, completedDeliveries: completed },
  });
});

module.exports = {
  getMyDeliveries,
  getAllDeliveries,
  getDeliveryByOrder,
  assignDelivery,
  updateDeliveryStatus,
  getDeliveryStats,
};
