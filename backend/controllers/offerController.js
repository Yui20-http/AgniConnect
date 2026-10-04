const Offer = require('../models/Offer');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../utils/notify');
const { emitToUser, emitToAll } = require('../utils/socket');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const { ORDER_STATUS, PLATFORM_COMMISSION_RATE } = require('../config/constants');
const { calculatePayoutBreakdown } = require('../utils/commerce');
const { geocodeLocation } = require('../utils/geo');
const { estimateDelivery } = require('../utils/deliveryPricing');

const createOffer = asyncHandler(async (req, res) => {
  const { productId, quantity, askingPricePerUnit, message } = req.body || {};
  const product = await Product.findById(productId);
  const qty = Number(quantity);
  const price = Number(askingPricePerUnit);
  if (!product || !product.isAvailable) {
    res.status(404);
    throw new Error('Product is unavailable');
  }
  if (!Number.isInteger(qty) || qty < (product.minOrderQuantity || 1) || qty > product.quantity) {
    res.status(400);
    throw new Error(`Quantity must be between ${product.minOrderQuantity || 1} and ${product.quantity} ${product.unit}`);
  }
  if (!Number.isFinite(price) || price <= 0 || price >= product.pricePerUnit) {
    res.status(400);
    throw new Error('Offer price must be positive and lower than the listed unit price');
  }

  const offer = await Offer.create({
    buyer: req.user._id,
    farmer: product.farmer,
    product: product._id,
    quantity: qty,
    askingPricePerUnit: price,
    message: String(message || '').slice(0, 500),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });
  await createNotification({ user: product.farmer, title: 'Bulk price offer', message: `${req.user.name} offered ₹${price}/${product.unit} for ${qty} ${product.unit} of ${product.name}.`, type: 'order', link: '/farmer/requests', meta: { offerId: offer._id } });
  emitToUser(product.farmer, 'offer:new', offer);
  res.status(201).json({ success: true, message: 'Offer sent to the farmer; it expires in 48 hours.', data: offer });
});

const getOffers = asyncHandler(async (req, res) => {
  const query = req.user.role === 'buyer' ? { buyer: req.user._id } : { farmer: req.user._id };
  const offers = await Offer.find(query)
    .populate('buyer', 'name')
    .populate('farmer', 'name farmName')
    .populate('product', 'name unit pricePerUnit image quantity')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: offers });
});

const respondToOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id).populate('product', 'name unit');
  if (!offer) {
    res.status(404);
    throw new Error('Offer not found');
  }
  if (offer.status === 'Pending' && offer.expiresAt <= new Date()) {
    offer.status = 'Expired';
    await offer.save();
    res.status(400);
    throw new Error('This offer expired. Ask the buyer to submit a new one.');
  }

  const { action, counterPricePerUnit } = req.body || {};
  const isFarmer = String(offer.farmer) === String(req.user._id);
  const isBuyer = String(offer.buyer) === String(req.user._id);
  if (isFarmer && offer.status === 'Pending') {
    if (action === 'accept') offer.status = 'Accepted';
    else if (action === 'reject') offer.status = 'Rejected';
    else if (action === 'counter') {
      const product = offer.product;
      const counter = Number(counterPricePerUnit);
      if (!Number.isFinite(counter) || counter <= 0 || counter >= product.pricePerUnit) {
        res.status(400);
        throw new Error('Counter price must be positive and below the current list price');
      }
      offer.counterPricePerUnit = counter;
      offer.status = 'Countered';
    } else {
      res.status(400);
      throw new Error('Choose accept, reject, or counter');
    }
  } else if (isBuyer && offer.status === 'Countered') {
    if (action === 'accept') {
      offer.askingPricePerUnit = offer.counterPricePerUnit;
      offer.status = 'Accepted';
    } else if (action === 'reject') offer.status = 'Rejected';
    else {
      res.status(400);
      throw new Error('Choose accept or reject for the farmer counter-offer');
    }
  } else {
    res.status(403);
    throw new Error('This offer cannot be changed by your account or in its current state');
  }

  offer.expiresAt = offer.status === 'Countered' ? new Date(Date.now() + 48 * 60 * 60 * 1000) : offer.expiresAt;
  await offer.save();
  const recipient = isFarmer ? offer.buyer : offer.farmer;
  await createNotification({ user: recipient, title: `Offer ${offer.status.toLowerCase()}`, message: `Offer for ${offer.product.name} is now ${offer.status.toLowerCase()}.`, type: 'order', link: isFarmer ? '/buyer/plans' : '/farmer/requests', meta: { offerId: offer._id } });
  emitToUser(recipient, 'offer:updated', offer);
  res.json({ success: true, message: `Offer ${offer.status.toLowerCase()}`, data: offer });
});

const checkoutAcceptedOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer || String(offer.buyer) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Accepted offer not found');
  }
  if (offer.status !== 'Accepted' || offer.expiresAt <= new Date()) {
    res.status(400);
    throw new Error('Only a current accepted offer can be ordered');
  }
  const product = await Product.findById(offer.product);
  if (!product || !product.isAvailable || product.quantity < offer.quantity) {
    res.status(400);
    throw new Error('The product no longer has enough stock');
  }
  const deliveryAddress = String(req.body?.deliveryAddress || req.user.address || '').trim();
  if (!deliveryAddress) {
    res.status(400);
    throw new Error('Delivery address is required');
  }

  const unitPrice = Number(offer.askingPricePerUnit);
  const subtotal = Number((unitPrice * offer.quantity).toFixed(2));
  const payout = calculatePayoutBreakdown(subtotal, PLATFORM_COMMISSION_RATE);
  const farmer = await User.findById(offer.farmer);
  const pickupLocation = farmer?.farmLocation || farmer?.location || product.location || '';
  const deliveryLocation = req.body?.deliveryLocation || req.user.location || deliveryAddress;
  const deliveryEstimate = estimateDelivery({
    pickupCoordinates: geocodeLocation(pickupLocation),
    deliveryCoordinates: geocodeLocation(deliveryLocation),
    pickupLocation,
    deliveryLocation,
  });
  const order = await Order.create({
    buyer: offer.buyer,
    farmer: offer.farmer,
    totalAmount: subtotal,
    deliveryFee: deliveryEstimate.deliveryFee,
    deliveryDistanceKm: deliveryEstimate.distanceKm,
    grandTotal: subtotal + deliveryEstimate.deliveryFee,
    platformCommissionRate: PLATFORM_COMMISSION_RATE,
    commissionAmount: payout.platformCommission,
    farmerPayoutAmount: payout.farmerPayout,
    deliveryAddress,
    deliveryLocation,
    pickupLocation,
    coordinates: { pickup: geocodeLocation(pickupLocation) || { lat: null, lng: null }, delivery: geocodeLocation(deliveryAddress) || { lat: null, lng: null } },
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Pending',
    notes: `Created from accepted bulk offer ${offer._id}.`,
    status: ORDER_STATUS.PENDING,
    statusHistory: [{ status: ORDER_STATUS.PENDING, note: 'Order placed from accepted bulk offer' }],
  });
  const orderItem = await OrderItem.create({ order: order._id, product: product._id, farmer: offer.farmer, name: product.name, image: product.image, unit: product.unit, quantity: offer.quantity, pricePerUnit: unitPrice, subtotal });
  order.items.push(orderItem._id);
  await order.save();

  product.quantity -= offer.quantity;
  product.soldCount = Number(product.soldCount || 0) + offer.quantity;
  if (product.quantity === 0) product.isAvailable = false;
  await product.save();
  emitToAll('product:updated', { action: 'bulk-offer-order', productId: product._id, quantity: product.quantity });
  offer.status = 'Ordered';
  await offer.save();
  await createNotification({ user: offer.farmer, title: 'Bulk order placed', message: `Accepted offer placed as order ${order.orderNumber}.`, type: 'order', link: '/farmer/orders', meta: { orderId: order._id } });
  emitToUser(offer.farmer, 'order:new', order);
  res.status(201).json({ success: true, message: 'Bulk order placed with Cash on Delivery', data: order });
});

module.exports = { createOffer, getOffers, respondToOffer, checkoutAcceptedOffer };
