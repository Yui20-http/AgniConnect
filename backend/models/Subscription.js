const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    frequencyDays: { type: Number, default: 7, enum: [7] },
    deliveryAddress: { type: String, required: true },
    deliveryLocation: { type: String, default: '' },
    paymentMethod: { type: String, default: 'Cash on Delivery', enum: ['Cash on Delivery'] },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Active', 'Paused', 'Cancelled'], index: true },
    nextOrderAt: { type: Date, required: true, index: true },
    lastOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
