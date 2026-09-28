const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES, UNITS } = require('../config/constants');

/**
 * Product model - a listing created by a farmer.
 */
const productSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    unit: {
      type: String,
      enum: UNITS,
      default: 'kg',
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price per unit is required'],
      min: [0, 'Price cannot be negative'],
    },
    minOrderQuantity: {
      type: Number,
      default: 1,
      min: [1, 'Minimum order quantity must be at least 1'],
    },
    bulkPricing: [
      {
        minQty: { type: Number, required: true, min: 1 },
        pricePerUnit: { type: Number, required: true, min: 0 },
      },
    ],
    harvestDate: {
      type: Date,
    },
    isPreOrder: { type: Boolean, default: false },
    location: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    // Simple coordinates used by Leaflet on the tracking / product pages.
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    // Denormalised counter used for "popular" sorting.
    soldCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text index so that search can use $text if desired.
productSchema.index({ name: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('Product', productSchema);
