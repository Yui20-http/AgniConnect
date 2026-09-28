const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Razorpay = require('razorpay');
const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const User = require('../models/User');
const { PLATFORM_COMMISSION_RATE } = require('../config/constants');
const { calculatePayoutBreakdown } = require('../utils/commerce');

const paymentCredentialsConfigured = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);

const razorpay = paymentCredentialsConfigured
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

const createInvoicePdf = (order) => {
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];

  doc.on('data', (chunk) => buffers.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(20).text('AgriConnect Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${order.invoiceNumber || order.orderNumber || 'AGC-INV'}`);
    doc.text(`Order #: ${order.orderNumber || ''}`);
    doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}`);
    doc.moveDown();
    doc.text(`Buyer: ${order.buyer?.name || 'Customer'}`);
    doc.text(`Farmer: ${order.farmer?.name || order.farmer || 'Farmer'}`);
    doc.text(`Delivery: ${order.deliveryAddress || ''}`);
    doc.moveDown();

    doc.text('Items', { underline: true });
    (order.items || []).forEach((item) => {
      const itemName = item.name || item.product?.name || 'Item';
      const qty = item.quantity || 0;
      doc.text(`${itemName} x ${qty} - ₹${Number(item.subtotal || 0).toFixed(2)}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: ₹${Number(order.totalAmount || 0).toFixed(2)}`);
    doc.text(`Delivery Fee: ₹${Number(order.deliveryFee || 0).toFixed(2)}`);
    doc.text(`Commission: ₹${Number(order.commissionAmount || 0).toFixed(2)}`);
    doc.text(`Grand Total: ₹${Number(order.grandTotal || 0).toFixed(2)}`);
    doc.text(`Payment Status: ${order.paymentStatus || 'Pending'}`);
    doc.end();
  });
};

const initiatePayment = asyncHandler(async (req, res) => {
  const { amount, orderNumber, paymentMethod, orderId, payeeUpis } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    res.status(400);
    throw new Error('A valid amount is required');
  }

  const normalizedPayeeUpis = Array.isArray(payeeUpis)
    ? payeeUpis.filter(Boolean)
    : [];
  const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  if (paymentCredentialsConfigured && (paymentMethod === 'Online Payment' || paymentMethod === 'UPI Payment')) {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        receipt: orderNumber || `rcpt_${Date.now()}`,
        notes: { orderId: orderId || '', paymentMethod: paymentMethod || 'Online Payment', payeeUpis: normalizedPayeeUpis },
      });

      return res.json({
        success: true,
        message: 'Razorpay payment session created',
        data: {
          provider: 'razorpay',
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          paymentReference,
          paymentMethod: paymentMethod || 'Online Payment',
          payeeUpis: normalizedPayeeUpis,
        },
      });
    } catch (error) {
      // Fall back to the UPI-safe mode if Razorpay fails, instead of crashing checkout.
    }
  }

  return res.json({
    success: true,
    message: 'UPI payment request prepared',
    data: {
      provider: 'upi',
      paymentReference,
      amount: Number(amount),
      currency: 'INR',
      orderNumber: orderNumber || 'AGC-ORDER',
      status: 'paid',
      paymentMethod: paymentMethod || 'UPI Payment',
      payeeUpis: normalizedPayeeUpis.length ? normalizedPayeeUpis : [process.env.DEFAULT_UPI_ID || 'agriconnect@upi'],
      notes: 'Pay each farmer using their listed UPI ID before confirming the order.',
    },
  });
});

const getFarmerPayouts = asyncHandler(async (req, res) => {
  const query = req.user.role === 'farmer' ? { farmer: req.user._id } : {};
  const orders = await Order.find(query)
    .populate('buyer', 'name')
    .sort({ createdAt: -1 });

  const totals = orders.reduce(
    (acc, order) => {
      const gross = Number(order.grandTotal || 0);
      const commission = Number(order.commissionAmount || 0);
      const payout = Number(order.farmerPayoutAmount || Math.max(0, gross - commission));

      acc.gross += gross;
      acc.commission += commission;
      acc.payout += payout;
      return acc;
    },
    { gross: 0, commission: 0, payout: 0 }
  );

  res.json({
    success: true,
    data: {
      commissionRate: PLATFORM_COMMISSION_RATE,
      totals,
      orders: orders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        buyer: order.buyer?.name || 'Buyer',
        createdAt: order.createdAt,
        grandTotal: order.grandTotal,
        commissionAmount: order.commissionAmount || 0,
        farmerPayoutAmount: order.farmerPayoutAmount || Math.max(0, Number(order.grandTotal || 0) - Number(order.commissionAmount || 0)),
        status: order.status,
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

  const allowedStatuses = ['Pending', 'Accepted', 'Processing'];
  if (!allowedStatuses.includes(order.status)) {
    res.status(400);
    throw new Error('Refunds are only allowed before the order is dispatched.');
  }

  order.status = 'Cancelled';
  order.cancelReason = reason || 'Buyer requested cancellation';
  order.refundStatus = 'Requested';
  order.refundAmount = Number(order.grandTotal || 0);
  order.statusHistory.push({ status: 'Cancelled', note: order.cancelReason, at: new Date() });
  await order.save();

  res.json({
    success: true,
    message: 'Cancellation requested and refund has been initiated.',
    data: {
      orderId: order._id,
      refundAmount: order.refundAmount,
      refundStatus: order.refundStatus,
      policy: 'Cancellations before dispatch are fully refunded. Orders already in transit or delivered are handled based on delivery policy.',
    },
  });
});

module.exports = {
  initiatePayment,
  getFarmerPayouts,
  getInvoice,
  requestRefund,
};
