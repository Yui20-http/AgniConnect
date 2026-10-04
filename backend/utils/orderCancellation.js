const Razorpay = require('razorpay');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const PaymentTransaction = require('../models/PaymentTransaction');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const { emitToAll } = require('./socket');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');

const gatewayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = gatewayConfigured
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

const cancelOrderAndRefund = async (order, reason = 'Buyer requested cancellation') => {
  const cancellable = [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PROCESSING];
  if (!cancellable.includes(order.status)) {
    const error = new Error('Orders can only be cancelled before dispatch.');
    error.statusCode = 400;
    throw error;
  }

  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    if (!razorpay || !order.paymentReference) {
      const error = new Error('The payment is paid but gateway refund details are unavailable. Contact support before cancelling.');
      error.statusCode = 409;
      throw error;
    }

    const refund = await razorpay.payments.refund(order.paymentReference, {
      amount: Math.round(Number(order.grandTotal || 0) * 100),
      notes: { orderNumber: order.orderNumber || String(order._id), reason },
    });
    order.refundStatus = refund.status === 'processed' ? 'Processed' : 'Processing';
    order.refundAmount = Number(order.grandTotal || 0);
    order.refundReference = refund.id;
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  } else {
    order.refundStatus = 'Not Required';
    order.refundAmount = 0;
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelReason = reason;
  order.statusHistory.push({ status: ORDER_STATUS.CANCELLED, note: reason, at: new Date() });
  await order.save();

  const items = await OrderItem.find({ order: order._id });
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    product.quantity += item.quantity;
    product.soldCount = Math.max(0, Number(product.soldCount || 0) - item.quantity);
    product.isAvailable = product.quantity > 0;
    await product.save();
    emitToAll('product:updated', { action: 'restock', productId: product._id, quantity: product.quantity });
  }

  if (order.paymentTransaction) {
    const transaction = await PaymentTransaction.findById(order.paymentTransaction);
    if (transaction) {
      const linkedOrders = await Order.find({ _id: { $in: transaction.orders } }).select('status');
      if (linkedOrders.length && linkedOrders.every((linkedOrder) => linkedOrder.status === ORDER_STATUS.CANCELLED)) {
        transaction.status = 'refunded';
        await transaction.save();
      }
    }
  }

  const delivery = await Delivery.findOne({ order: order._id });
  if (delivery && delivery.deliveryPartner && delivery.status === 'Assigned') {
    await User.updateOne({ _id: delivery.deliveryPartner }, { $set: { isAvailable: true } });
    delivery.status = 'Failed';
    delivery.statusHistory.push({ status: 'Failed', note: 'Order cancelled before pickup' });
    delivery.deliveryOtpHash = '';
    await delivery.save();
  }

  return order;
};

module.exports = { cancelOrderAndRefund };
