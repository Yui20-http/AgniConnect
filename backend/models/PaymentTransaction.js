const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gateway: { type: String, enum: ['razorpay'], required: true, default: 'razorpay' },
    gatewayOrderId: { type: String, required: true, unique: true, index: true },
    gatewayPaymentId: { type: String, default: '', index: true },
    signature: { type: String, default: '' },
    amountPaise: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'verified', 'used', 'failed', 'refunded'], default: 'created', index: true },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
