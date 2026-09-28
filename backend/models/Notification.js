const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

/**
 * Notification model.
 * Notifications are created by the backend whenever something relevant
 * happens (new order, status change, low stock, ...). They are delivered to
 * the frontend both through the REST API and in real time via Socket.IO.
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      default: NOTIFICATION_TYPES.SYSTEM,
    },
    // Optional link so the frontend can navigate on click.
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
