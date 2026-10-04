const mongoose = require('mongoose');
const { DELIVERY_STATUS } = require('../config/constants');

/**
 * Delivery model.
 * Created when an order becomes "Ready for Pickup" and a delivery partner is
 * assigned. Tracks the logistics lifecycle independently from the order.
 */
const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pickupLocation: { type: String, default: '' },
    deliveryLocation: { type: String, default: '' },
    coordinates: {
      pickup: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
      delivery: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    },
    status: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.ASSIGNED,
      index: true,
    },
    distanceKm: { type: Number, default: 0 },
    courierDistanceKm: { type: Number, default: null },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      heading: { type: Number, default: null },
      speedKph: { type: Number, default: null },
    },
    locationUpdatedAt: { type: Date, default: null },
    deliveryOtpHash: { type: String, default: '', select: false },
    proofOfDelivery: {
      recipientName: { type: String, default: '' },
      note: { type: String, default: '' },
      photoUrl: { type: String, default: '' },
      confirmedAt: { type: Date, default: null },
    },
    estimatedDelivery: { type: Date, default: null },
    statusHistory: [
      {
        status: { type: String },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Delivery', deliverySchema);
