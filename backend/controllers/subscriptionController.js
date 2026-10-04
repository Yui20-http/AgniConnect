const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');
const { emitToUser, emitToAll } = require('../utils/socket');
const { ORDER_STATUS, PLATFORM_COMMISSION_RATE } = require('../config/constants');
const { calculatePayoutBreakdown, calculateTieredUnitPrice } = require('../utils/commerce');
const { geocodeLocation } = require('../utils/geo');
const { estimateDelivery } = require('../utils/deliveryPricing');

const createSubscription = asyncHandler(async (req, res) => {
  const { productId, quantity, deliveryAddress, deliveryLocation, startAt } = req.body || {};
  const product = await Product.findById(productId).populate('farmer', 'name farmName farmLocation location');
  if (!product || !product.isAvailable) {
    res.status(400);
    throw new Error('Product is not available for a weekly plan');
  }
  if (!deliveryAddress || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    res.status(400);
    throw new Error('Provide a delivery address and a whole-number quantity of at least 1');
  }
  if (Number(quantity) > Number(product.quantity)) {
    res.status(400);
    throw new Error('Subscription quantity exceeds the product quantity listed');
  }

  const nextOrderAt = startAt ? new Date(startAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(nextOrderAt.getTime()) || nextOrderAt < new Date(Date.now() - 60_000)) {
    res.status(400);
    throw new Error('Choose a future start date for the weekly plan');
  }

  const subscription = await Subscription.create({
    buyer: req.user._id,
    farmer: product.farmer._id,
    product: product._id,
    quantity: Number(quantity),
    deliveryAddress: String(deliveryAddress).trim(),
    deliveryLocation: deliveryLocation || '',
    status: 'Pending',
    nextOrderAt,
  });

  await createNotification({
    user: product.farmer._id,
    title: 'Weekly subscription received',
    message: `${req.user.name} requested a weekly plan for ${product.name}.`,
    type: 'order',
    link: '/farmer/requests',
    meta: { subscriptionId: subscription._id },
  });

  res.status(201).json({ success: true, message: 'Weekly Cash on Delivery plan created', data: subscription });
});

const getSubscriptions = asyncHandler(async (req, res) => {
  const query = req.user.role === 'buyer' ? { buyer: req.user._id } : { farmer: req.user._id };
  const subscriptions = await Subscription.find(query)
    .populate('buyer', 'name phone')
    .populate('farmer', 'name farmName')
    .populate('product', 'name image unit pricePerUnit harvestDate')
    .populate('lastOrder', 'orderNumber status')
    .sort({ updatedAt: -1 });
  res.json({ success: true, data: subscriptions });
});

const updateSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }
  const isBuyer = String(subscription.buyer) === String(req.user._id);
  const isFarmer = String(subscription.farmer) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isBuyer && !isFarmer && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to update this plan');
  }

  const { action } = req.body || {};
  if (action === 'cancel') subscription.status = 'Cancelled';
  else if (action === 'pause' && isBuyer) subscription.status = 'Paused';
  else if (action === 'resume' && isBuyer) {
    subscription.status = 'Active';
    if (subscription.nextOrderAt <= new Date()) subscription.nextOrderAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else if (action === 'accept' && isFarmer) subscription.status = 'Active';
  else if (action === 'reject' && isFarmer) subscription.status = 'Cancelled';
  else {
    res.status(400);
    throw new Error('Invalid plan action for your account');
  }

  await subscription.save();
  res.json({ success: true, message: `Weekly plan ${subscription.status.toLowerCase()}`, data: subscription });
});

let workerRunning = false;
const processDueSubscriptions = async () => {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const due = await Subscription.find({ status: 'Active', nextOrderAt: { $lte: new Date() } }).limit(30);
    for (const schedule of due) {
      const product = await Product.findById(schedule.product);
      if (!product || !product.isAvailable || Number(product.quantity) < Number(schedule.quantity)) {
        schedule.lastError = 'Insufficient available stock; the scheduler will retry tomorrow.';
        schedule.nextOrderAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await schedule.save();
        continue;
      }

      const unitPrice = calculateTieredUnitPrice(product, schedule.quantity);
      const subtotal = Number((unitPrice * schedule.quantity).toFixed(2));
      const breakdown = calculatePayoutBreakdown(subtotal, PLATFORM_COMMISSION_RATE);
      const farmer = await require('../models/User').findById(schedule.farmer);
      const pickupLocation = farmer?.farmLocation || farmer?.location || product.location || '';
      const deliveryEstimate = estimateDelivery({
        pickupCoordinates: geocodeLocation(pickupLocation),
        deliveryCoordinates: geocodeLocation(schedule.deliveryLocation || schedule.deliveryAddress),
        pickupLocation,
        deliveryLocation: schedule.deliveryLocation || schedule.deliveryAddress,
      });
      const coordinates = geocodeLocation(pickupLocation);
      const order = await Order.create({
        buyer: schedule.buyer,
        farmer: schedule.farmer,
        totalAmount: subtotal,
        deliveryFee: deliveryEstimate.deliveryFee,
        deliveryDistanceKm: deliveryEstimate.distanceKm,
        grandTotal: subtotal + deliveryEstimate.deliveryFee,
        platformCommissionRate: PLATFORM_COMMISSION_RATE,
        commissionAmount: breakdown.platformCommission,
        farmerPayoutAmount: breakdown.farmerPayout,
        subscription: schedule._id,
        deliveryAddress: schedule.deliveryAddress,
        deliveryLocation: schedule.deliveryLocation,
        pickupLocation,
        coordinates: { pickup: coordinates || { lat: null, lng: null }, delivery: { lat: null, lng: null } },
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Pending',
        notes: 'Created from weekly subscription plan.',
        status: ORDER_STATUS.PENDING,
        statusHistory: [{ status: ORDER_STATUS.PENDING, note: 'Weekly subscription order generated' }],
      });
      const item = await OrderItem.create({
        order: order._id,
        product: product._id,
        farmer: schedule.farmer,
        name: product.name,
        image: product.image,
        unit: product.unit,
        quantity: schedule.quantity,
        pricePerUnit: unitPrice,
        subtotal,
      });
      order.items.push(item._id);
      await order.save();

      product.quantity -= schedule.quantity;
      product.soldCount = Number(product.soldCount || 0) + schedule.quantity;
      if (!product.quantity) product.isAvailable = false;
      await product.save();
      emitToAll('product:updated', { action: 'subscription-order', productId: product._id, quantity: product.quantity });
      emitToUser(schedule.buyer, 'order:new', order);
      emitToUser(schedule.farmer, 'order:new', order);
      await createNotification({ user: schedule.farmer, title: 'Weekly order generated', message: `Subscription order ${order.orderNumber} was created.`, type: 'order', link: '/farmer/orders', meta: { orderId: order._id } });

      schedule.lastOrder = order._id;
      schedule.lastError = '';
      schedule.nextOrderAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await schedule.save();
    }
  } catch (error) {
    console.error('Subscription scheduler error:', error.message);
  } finally {
    workerRunning = false;
  }
};

module.exports = { createSubscription, getSubscriptions, updateSubscription, processDueSubscriptions };
