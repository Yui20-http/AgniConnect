const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');

/**
 * Order model.
 * An order is created by a buyer and belongs to a single farmer (for the
 * demo we keep one farmer per order - the cart is grouped by farmer at
 * checkout). It also tracks the assigned delivery partner.
 */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderItem',
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryDistanceKm: { type: Number, default: 0, min: 0 },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    platformCommissionRate: {
      type: Number,
      default: 6,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    farmerPayoutAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    payoutStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Paid'],
      default: 'Pending',
    },
    refundStatus: {
      type: String,
      default: 'Not Requested',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    invoiceNumber: {
      type: String,
      default: '',
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
    },
    deliveryLocation: {
      type: String,
      default: '',
    },
    pickupLocation: {
      type: String,
      default: '',
    },
    coordinates: {
      pickup: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
      delivery: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    paymentMethod: {
      type: String,
      default: 'Cash on Delivery',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    paymentTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      default: null,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
      index: true,
    },
    refundReference: {
      type: String,
      default: '',
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Human readable notes / cancellation reason.
    notes: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    // Timeline of status changes for the tracking page.
    statusHistory: [
      {
        status: { type: String },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate a friendly order number like AGC-2024-000123.
orderSchema.pre('save', async function (next) {
  if (this.orderNumber) return next();
  const count = await mongoose.model('Order').countDocuments();
  const year = new Date().getFullYear();
  this.orderNumber = `AGC-${year}-${String(count + 1).padStart(6, '0')}`;
  next();
});

module.exports = mongoose.model('Order', orderSchema);
