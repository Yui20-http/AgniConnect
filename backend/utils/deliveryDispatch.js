const crypto = require('crypto');
const User = require('../models/User');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const { createNotification } = require('./notify');
const { emitToUser } = require('./socket');
const { DELIVERY_STATUS, ORDER_STATUS } = require('../config/constants');
const { geocodeLocation } = require('./geo');
const { haversineKm } = require('./deliveryPricing');

const generateDeliveryOtp = () => String(crypto.randomInt(100000, 1000000));
const hashDeliveryOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const COURIER_LOCATION_MAX_AGE_MS = 30 * 60 * 1000;

const coordinatesForPartner = (partner) => {
  const lastFix = partner.courierLocation;
  const isFresh = lastFix?.updatedAt && Date.now() - new Date(lastFix.updatedAt).getTime() <= COURIER_LOCATION_MAX_AGE_MS;
  if (isFresh && Number.isFinite(Number(lastFix.lat)) && Number.isFinite(Number(lastFix.lng))) {
    return { lat: Number(lastFix.lat), lng: Number(lastFix.lng) };
  }
  return geocodeLocation(partner.location || '');
};

const claimAndAssign = async ({ order, delivery, partner }) => {
  const claimedPartner = await User.findOneAndUpdate(
    { _id: partner._id, role: 'delivery', isActive: true, isAvailable: true },
    { $set: { isAvailable: false } },
    { new: true }
  );
  if (!claimedPartner) return false;

  const otp = generateDeliveryOtp();
  delivery.deliveryPartner = claimedPartner._id;
  delivery.status = DELIVERY_STATUS.ASSIGNED;
  delivery.deliveryOtpHash = hashDeliveryOtp(otp);
  delivery.statusHistory.push({ status: DELIVERY_STATUS.ASSIGNED, note: `Nearest available courier assigned: ${claimedPartner.name}` });
  await delivery.save();

  order.deliveryPartner = claimedPartner._id;
  if ([ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PROCESSING].includes(order.status)) {
    order.status = ORDER_STATUS.READY_FOR_PICKUP;
    order.statusHistory.push({ status: ORDER_STATUS.READY_FOR_PICKUP, note: 'Courier assigned' });
  }
  await order.save();

  await createNotification({
    user: order.buyer,
    title: 'Courier assigned — delivery OTP',
    message: `Courier ${claimedPartner.name} is assigned to ${order.orderNumber}. Give this OTP to the courier at delivery: ${otp}`,
    type: 'delivery',
    link: `/buyer/orders/${order._id}/track`,
    meta: { orderId: order._id },
  });
  await createNotification({
    user: claimedPartner._id,
    title: 'New delivery assigned',
    message: `You have been assigned order ${order.orderNumber}. Ask the buyer for the delivery OTP at handoff.`,
    type: 'delivery',
    link: '/delivery/deliveries',
    meta: { orderId: order._id },
  });
  emitToUser(claimedPartner._id, 'delivery:assigned', delivery);
  emitToUser(order.buyer, 'delivery:updated', delivery);
  return true;
};

const assignNearestCourier = async (order, delivery) => {
  const pickup = delivery.coordinates?.pickup?.lat != null && delivery.coordinates?.pickup?.lng != null
    ? delivery.coordinates.pickup
    : geocodeLocation(delivery.pickupLocation || order.pickupLocation || '');
  const candidates = await User.find({ role: 'delivery', isActive: true, isAvailable: true })
    .select('_id name location courierLocation isAvailable vehicleType vehicleNumber')
    .lean();
  if (!candidates.length) return null;

  const sorted = candidates.map((partner) => {
    const point = coordinatesForPartner(partner);
    return { partner, distance: pickup && point ? haversineKm(pickup, point) : Number.POSITIVE_INFINITY };
  }).sort((a, b) => a.distance - b.distance);

  for (const entry of sorted) {
    if (await claimAndAssign({ order, delivery, partner: entry.partner })) {
      delivery.courierDistanceKm = Number.isFinite(entry.distance) ? Number(entry.distance.toFixed(1)) : null;
      await delivery.save();
      return { partnerId: entry.partner._id, courierDistanceKm: delivery.courierDistanceKm };
    }
  }
  return null;
};

const assignSpecificCourier = async (order, delivery, partner) => {
  const claimed = await claimAndAssign({ order, delivery, partner });
  if (!claimed) {
    const error = new Error('This courier is no longer available');
    error.statusCode = 409;
    throw error;
  }
  return delivery;
};

module.exports = { assignNearestCourier, assignSpecificCourier, hashDeliveryOtp };
