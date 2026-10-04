const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const Razorpay = require('razorpay');
const asyncHandler = require('../utils/asyncHandler');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const { PLATFORM_COMMISSION_RATE, PAYMENT_STATUS } = require('../config/constants');
const { calculateCartTotals } = require('../utils/commerce');
const { cancelOrderAndRefund } = require('../utils/orderCancellation');
const { verifyRazorpaySignature } = require('../utils/razorpaySignature');

const gatewayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = gatewayConfigured
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

const ensureGateway = (res) => {
  if (gatewayConfigured) return;
  res.status(503);
  throw new Error('Online payment is unavailable until Razorpay credentials are configured. Choose Cash on Delivery or contact the administrator.');
};

const getCartQuote = async (buyerId, deliveryLocation = '') => {
  const cart = await Cart.findOne({ buyer: buyerId }).populate({
    path: 'items.product',
    populate: { path: 'farmer', select: 'farmName farmLocation location' },
  });
  if (!cart || cart.items.length === 0) {
    const error = new Error('Your cart is empty');
    error.statusCode = 400;
    throw error;
  }

  for (const item of cart.items) {
    if (!item.product || !item.product.isAvailable || Number(item.quantity) > Number(item.product.quantity)) {
      const name = item.product?.name || 'A cart item';
      const error = new Error(`${name} is no longer available in the requested quantity`);
      error.statusCode = 400;
      throw error;
    }
  }

  return calculateCartTotals(cart.items, deliveryLocation);
};

const createInvoicePdf = (order) => {
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    doc.fontSize(20).text('AgriConnect Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Invoice: ${order.invoiceNumber || order.orderNumber || order._id}`);
    doc.text(`Order: ${order.orderNumber || order._id}`);
    doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}`);
    doc.text(`Buyer: ${order.buyer?.name || 'Buyer'} (${order.buyer?.email || ''})`);
    doc.text(`Farmer: ${order.farmer?.farmName || order.farmer?.name || 'Farmer'}`);
    doc.text(`Delivery address: ${order.deliveryAddress || ''}`);
    doc.moveDown();
    doc.fontSize(12).text('Items', { underline: true });
    (order.items || []).forEach((item) => {
      doc.fontSize(10).text(`${item.name || item.product?.name || 'Item'} — ${item.quantity} ${item.unit} x INR ${Number(item.pricePerUnit || 0).toFixed(2)} = INR ${Number(item.subtotal || 0).toFixed(2)}`);
    });
    doc.moveDown();
    doc.fontSize(11).text(`Produce subtotal: INR ${Number(order.totalAmount || 0).toFixed(2)}`);
    doc.text(`Delivery: INR ${Number(order.deliveryFee || 0).toFixed(2)}`);
    doc.text(`Platform commission (farmer ledger): INR ${Number(order.commissionAmount || 0).toFixed(2)}`);
    doc.fontSize(13).text(`Total paid/due: INR ${Number(order.grandTotal || 0).toFixed(2)}`);
    doc.fontSize(10).text(`Payment method/status: ${order.paymentMethod || 'Cash on Delivery'} / ${order.paymentStatus || PAYMENT_STATUS.PENDING}`);
    doc.end();
  });
};

const initiatePayment = asyncHandler(async (req, res) => {
  ensureGateway(res);
  const quote = await getCartQuote(req.user._id, req.body?.deliveryLocation || req.body?.deliveryAddress || req.user.location || req.user.address || '');
  const amountPaise = Math.round(quote.total * 100);
  if (amountPaise < 100) {
    res.status(400);
    throw new Error('Payment amount must be at least INR 1.00');
  }

  const receipt = `agc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const gatewayOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes: { buyerId: String(req.user._id), cartTotal: quote.total.toFixed(2) },
  });

  await PaymentTransaction.create({
    buyer: req.user._id,
    gatewayOrderId: gatewayOrder.id,
    amountPaise,
    amount: quote.total,
    currency: 'INR',
    status: 'created',
  });

  res.status(201).json({
    success: true,
    data: {
      provider: 'razorpay',
      keyId: process.env.RAZORPAY_KEY_ID,
      gatewayOrderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      quote: { subtotal: quote.subtotal, deliveryFee: quote.deliveryFee, total: quote.total, deliveryEstimates: quote.deliveryByFarmer },
    },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  ensureGateway(res);
  const { razorpay_order_id: gatewayOrderId, razorpay_payment_id: gatewayPaymentId, razorpay_signature: signature } = req.body || {};
  if (!gatewayOrderId || !gatewayPaymentId || !signature) {
    res.status(400);
    throw new Error('Razorpay payment details are incomplete');
  }

  const transaction = await PaymentTransaction.findOne({ gatewayOrderId, buyer: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error('Payment session not found');
  }
  if (transaction.status === 'used' || transaction.status === 'verified') {
    return res.json({ success: true, data: { verified: true, gatewayOrderId, gatewayPaymentId } });
  }

  if (!verifyRazorpaySignature(gatewayOrderId, gatewayPaymentId, signature, process.env.RAZORPAY_KEY_SECRET)) {
    transaction.status = 'failed';
    await transaction.save();
    res.status(400);
    throw new Error('Payment signature verification failed');
  }

  let gatewayPayment = await razorpay.payments.fetch(gatewayPaymentId);
  if (gatewayPayment.order_id === gatewayOrderId && gatewayPayment.status === 'authorized') {
    gatewayPayment = await razorpay.payments.capture(gatewayPaymentId, transaction.amountPaise, 'INR');
  }
  if (
    gatewayPayment.order_id !== gatewayOrderId ||
    Number(gatewayPayment.amount) !== transaction.amountPaise ||
    gatewayPayment.currency !== 'INR' ||
    gatewayPayment.status !== 'captured'
  ) {
    transaction.status = 'failed';
    await transaction.save();
    res.status(400);
    throw new Error('Gateway payment does not match the checkout amount or is not authorized');
  }

  transaction.gatewayPaymentId = gatewayPaymentId;
  transaction.signature = signature;
  transaction.status = 'verified';
  await transaction.save();
  res.json({ success: true, data: { verified: true, gatewayOrderId, gatewayPaymentId } });
});

const getFarmerPayouts = asyncHandler(async (req, res) => {
  const query = req.user.role === 'farmer' ? { farmer: req.user._id } : {};
  const orders = await Order.find(query).populate('buyer', 'name').sort({ createdAt: -1 });
  const activeOrders = orders.filter((order) => order.status !== 'Cancelled');
  const deliveredOrders = activeOrders.filter((order) => order.status === 'Delivered');
  const sum = (list, key) => Number(list.reduce((total, order) => total + Number(order[key] || 0), 0).toFixed(2));

  const totals = {
    grossProduceSales: sum(deliveredOrders, 'totalAmount'),
    platformCommission: sum(deliveredOrders, 'commissionAmount'),
    earned: sum(deliveredOrders, 'farmerPayoutAmount'),
    awaitingDelivery: sum(activeOrders.filter((order) => order.status !== 'Delivered'), 'farmerPayoutAmount'),
    pendingSettlement: sum(deliveredOrders.filter((order) => order.payoutStatus !== 'Paid'), 'farmerPayoutAmount'),
    settled: sum(deliveredOrders.filter((order) => order.payoutStatus === 'Paid'), 'farmerPayoutAmount'),
  };

  res.json({
    success: true,
    data: {
      commissionRate: PLATFORM_COMMISSION_RATE,
      totals,
      settlementNote: 'This page records net farmer earnings. Bank/UPI settlement is not automatically sent by this application.',
      orders: activeOrders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        buyer: order.buyer?.name || 'Buyer',
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        grossProduceSales: order.totalAmount,
        deliveryFee: order.deliveryFee,
        commissionAmount: order.commissionAmount || 0,
        farmerPayoutAmount: order.farmerPayoutAmount || 0,
        status: order.status,
        payoutStatus: order.status !== 'Delivered' ? 'Not yet earned' : (order.payoutStatus || 'Pending settlement'),
      })),
    },
  });
});

const getInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate('buyer', 'name email')
    .populate('farmer', 'name farmName')
    .populate({ path: 'items', populate: { path: 'product', select: 'name' } });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner =
    String(order.buyer?._id || order.buyer) === String(req.user._id) ||
    String(order.farmer?._id || order.farmer) === String(req.user._id) ||
    req.user.role === 'admin';
  if (!isOwner) {
    res.status(403);
    throw new Error('Not authorized to view this invoice');
  }

  const pdf = await createInvoicePdf(order);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber || order._id}.pdf`);
  res.send(pdf);
});

const requestRefund = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body || {};
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (String(order.buyer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the buyer or an admin can cancel this order');
  }

  try {
    const cancelled = await cancelOrderAndRefund(order, reason || 'Buyer requested cancellation');
    res.json({
      success: true,
      message: cancelled.refundStatus === 'Not Required' ? 'Order cancelled. No online refund was required.' : 'Order cancelled and refund submitted to Razorpay.',
      data: {
        orderId: cancelled._id,
        refundAmount: cancelled.refundAmount,
        refundStatus: cancelled.refundStatus,
        refundReference: cancelled.refundReference || '',
        policy: 'Full cancellation is available before dispatch (Pending, Accepted, or Processing). Paid online orders are refunded through Razorpay; COD orders have no payment to refund. Dispatched/delivered orders cannot be cancelled here.',
      },
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    throw error;
  }
});

module.exports = { initiatePayment, verifyPayment, getFarmerPayouts, getInvoice, requestRefund };
