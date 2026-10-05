const crypto = require('crypto');
const User = require('../models/User');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const { createNotification } = require('./notify');
const { emitToUser } = require('./socket');
const Notification = require('../models/Notification');
const { DELIVERY_STATUS, ORDER_STATUS } = require('../config/constants');
const { geocodeLocation } = require('./geo');
const { haversineKm } = require('./deliveryPricing');
const { sendDeliveryOtpSms, isMsg91Configured } = require('./sms');

const generateDeliveryOtp = () => String(crypto.randomInt(100000, 1000000));
const hashDeliveryOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const DELIVERY_OTP_TTL_MS = 2 * 60 * 60 * 1000;
const DELIVERY_OTP_REISSUE_COOLDOWN_MS = 30 * 1000;

const issueDeliveryOtp = async (delivery, order) => {
  const otp = generateDeliveryOtp();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + DELIVERY_OTP_TTL_MS);
  delivery.deliveryOtpHash = hashDeliveryOtp(otp);
  delivery.deliveryOtpIssuedAt = issuedAt;
  delivery.deliveryOtpExpiresAt = expiresAt;
  await delivery.save();

  await Notification.updateMany(
    {
      user: order.buyer,
      type: 'delivery',
      'meta.orderId': order._id,
      $or: [
        { 'meta.kind': 'delivery_otp' },
        // Older assignment notifications did not include meta.kind.
        { title: { $regex: '^Courier assigned' } },
      ],
    },
    { $set: { isRead: true, message: 'This code was replaced. Use the newest delivery OTP notification.' } }
  );
  emitToUser(order.buyer, 'notifications:refresh', { orderId: order._id });

  const notification = await createNotification({
    user: order.buyer,
    title: 'Your delivery OTP',
    message: `Your new delivery code is ${otp}. Give it to the courier when your order arrives. It expires in 2 hours.`,
    type: 'delivery',
    link: `/buyer/orders/${order._id}/track`,
    meta: { kind: 'delivery_otp', orderId: order._id, deliveryId: delivery._id, expiresAt },
  });
  let sms = { configured: isMsg91Configured(), sent: false };
  try {
    const buyer = await User.findById(order.buyer).select('phone').lean();
    sms = await sendDeliveryOtpSms({ phone: buyer?.phone, otp, orderNumber: order.orderNumber });
  } catch (error) {
    console.error(`Could not prepare delivery OTP SMS: ${error.message}`);
  }
  return { issuedAt, expiresAt, notification, sms };
};

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

  delivery.deliveryPartner = claimedPartner._id;
  delivery.status = DELIVERY_STATUS.ASSIGNED;
  delivery.statusHistory.push({ status: DELIVERY_STATUS.ASSIGNED, note: `Nearest available courier assigned: ${claimedPartner.name}` });
  await issueDeliveryOtp(delivery, order);

  order.deliveryPartner = claimedPartner._id;
  if ([ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PROCESSING].includes(order.status)) {
    order.status = ORDER_STATUS.READY_FOR_PICKUP;
    order.statusHistory.push({ status: ORDER_STATUS.READY_FOR_PICKUP, note: 'Courier assigned' });
  }
  await order.save();

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

module.exports = {
  assignNearestCourier,
  assignSpecificCourier,
  hashDeliveryOtp,
  issueDeliveryOtp,
  DELIVERY_OTP_TTL_MS,
  DELIVERY_OTP_REISSUE_COOLDOWN_MS,
};
