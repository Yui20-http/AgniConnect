const mongoose = require('mongoose');

/**
 * OrderItem model.
 * Each order contains one or more order items. An order item stores a
 * snapshot of the product at the time of purchase (name, price, unit) so that
 * later edits to the product do not change historical orders.
 */
const orderItemSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    unit: { type: String, default: 'kg' },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OrderItem', orderItemSchema);
