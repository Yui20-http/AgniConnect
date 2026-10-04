const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');
const { emitToUser } = require('../utils/socket');
const { DELIVERY_STATUS, ORDER_STATUS } = require('../config/constants');
const { assignNearestCourier, assignSpecificCourier } = require('../utils/deliveryDispatch');

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
    .populate('order', 'orderNumber grandTotal status items deliveryAddress pickupLocation deliveryDistanceKm')
    .populate('farmer', 'name farmName farmLocation location phone')
    .populate('buyer', 'name phone address location')
    .populate('deliveryPartner', 'name phone vehicleType vehicleNumber');
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery not found for this order');
  }
  if (!delivery.distanceKm && delivery.order?.deliveryDistanceKm) {
    delivery.distanceKm = delivery.order.deliveryDistanceKm;
  }
  const allowed = req.user.role === 'admin' ||
    String(delivery.buyer) === String(req.user._id) ||
    String(delivery.farmer) === String(req.user._id) ||
    String(delivery.deliveryPartner || '') === String(req.user._id);
  if (!allowed) {
    res.status(403);
    throw new Error('Not authorized to view this delivery');
  }
  if (String(delivery.deliveryPartner || '') === String(req.user._id) && req.user.role === 'delivery') {
    delivery.deliveryOtpHash = undefined;
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

  if (order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
    res.status(400);
    throw new Error('This order is not ready for pickup yet');
  }

  let delivery = await Delivery.findOne({ order: orderId });
  if (!delivery) {
    delivery = await Delivery.create({
      order: orderId,
      farmer: order.farmer,
      buyer: order.buyer,
      pickupLocation: order.pickupLocation,
      deliveryLocation: order.deliveryLocation,
      coordinates: order.coordinates,
      distanceKm: order.deliveryDistanceKm,
      status: DELIVERY_STATUS.ASSIGNED,
      statusHistory: [{ status: DELIVERY_STATUS.ASSIGNED, note: 'Searching for an available delivery partner' }],
    });
  }

  if (!deliveryPartnerId) {
    if (delivery.deliveryPartner) {
      res.status(409);
      throw new Error('A delivery partner is already assigned');
    }
    const assignment = await assignNearestCourier(order, delivery);
    if (!assignment) {
      res.status(409);
      throw new Error('No available courier could be assigned. Please try again later.');
    }
    return res.json({ success: true, message: 'Nearest available delivery partner assigned', data: delivery });
  }

  const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery', isActive: true, isAvailable: true });
  if (!partner) {
    res.status(404);
    throw new Error('No available delivery partner matches this selection');
  }

  await assignSpecificCourier(order, delivery, partner);

  res.json({ success: true, message: 'Delivery partner assigned', data: delivery });
});

/**
 * @desc    Update delivery status (delivery partner)
 * @route   PUT /api/deliveries/:id/status
 * @access  Private/Delivery or Admin
 */
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status, note, otp, recipientName, proofNote } = req.body;
  const delivery = await Delivery.findById(req.params.id).select('+deliveryOtpHash');
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

  const allowedNext = {
    [DELIVERY_STATUS.ASSIGNED]: [DELIVERY_STATUS.PICKED_UP],
    [DELIVERY_STATUS.PICKED_UP]: [DELIVERY_STATUS.IN_TRANSIT],
    [DELIVERY_STATUS.IN_TRANSIT]: [DELIVERY_STATUS.DELIVERED],
  };
  if (status !== delivery.status && !(allowedNext[delivery.status] || []).includes(status) && req.user.role !== 'admin') {
    res.status(400);
    throw new Error(`Cannot move a ${delivery.status} delivery to ${status}`);
  }

  if (status === DELIVERY_STATUS.DELIVERED) {
    const receivedHash = crypto.createHash('sha256').update(String(otp || '')).digest();
    const expectedHash = Buffer.from(delivery.deliveryOtpHash || '', 'hex');
    if (expectedHash.length !== receivedHash.length || !crypto.timingSafeEqual(expectedHash, receivedHash)) {
      res.status(400);
      throw new Error('A valid buyer delivery OTP is required to complete delivery');
    }
    if (!String(recipientName || '').trim()) {
      res.status(400);
      throw new Error('Recipient name is required as proof of delivery');
    }
    delivery.proofOfDelivery = {
      recipientName: String(recipientName).trim().slice(0, 100),
      note: String(proofNote || '').trim().slice(0, 500),
      photoUrl: req.fileUrl || '',
      confirmedAt: new Date(),
    };
    delivery.deliveryOtpHash = '';
  }

  delivery.status = status;
  delivery.statusHistory.push({ status, note: note || `Marked as ${status}` });
  if (status === DELIVERY_STATUS.DELIVERED) delivery.completedAt = new Date();
  await delivery.save();
  delivery.deliveryOtpHash = undefined;

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
        await User.updateOne({ _id: delivery.deliveryPartner }, { $set: { isAvailable: true } });
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

const updateDeliveryLocation = asyncHandler(async (req, res) => {
  const { lat, lng, heading, speedKph } = req.body || {};
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    res.status(400);
    throw new Error('Valid latitude and longitude are required');
  }

  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery not found');
  }
  if (req.user.role !== 'admin' && String(delivery.deliveryPartner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Only the assigned courier can update this location');
  }
  if (![DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.IN_TRANSIT].includes(delivery.status)) {
    res.status(400);
    throw new Error('Live GPS sharing is available only after pickup and before delivery');
  }

  delivery.currentLocation = {
    lat: latitude,
    lng: longitude,
    heading: Number.isFinite(Number(heading)) ? Number(heading) : null,
    speedKph: Number.isFinite(Number(speedKph)) ? Number(speedKph) : null,
  };
  delivery.locationUpdatedAt = new Date();
  const locationWrites = [delivery.save()];
  if (req.user.role === 'delivery') {
    locationWrites.push(User.updateOne(
      { _id: req.user._id, role: 'delivery' },
      { $set: { courierLocation: { lat: latitude, lng: longitude, updatedAt: delivery.locationUpdatedAt } } }
    ));
  }
  await Promise.all(locationWrites);
  const payload = { deliveryId: delivery._id, orderId: delivery.order, currentLocation: delivery.currentLocation, locationUpdatedAt: delivery.locationUpdatedAt };
  emitToUser(delivery.buyer, 'delivery:location', payload);
  emitToUser(delivery.farmer, 'delivery:location', payload);
  res.json({ success: true, data: payload });
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
  updateDeliveryLocation,
  getDeliveryStats,
};
