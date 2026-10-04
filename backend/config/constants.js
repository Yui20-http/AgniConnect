/**
 * Central place for all shared constants used across the backend.
 * Keeping them here avoids "magic strings" scattered in the code.
 */

const ROLES = {
  FARMER: 'farmer',
  BUYER: 'buyer',
  DELIVERY: 'delivery',
  ADMIN: 'admin',
};

const PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains',
  'Pulses',
  'Spices',
  'Dairy',
  'Other',
];

const UNITS = ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece', 'bundle'];

// Order lifecycle. The order of this array matters: it is used to build the
// tracking timeline on the frontend.
const ORDER_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PROCESSING: 'Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const ORDER_STATUS_FLOW = [
  'Pending',
  'Accepted',
  'Processing',
  'Ready for Pickup',
  'Picked Up',
  'In Transit',
  'Delivered',
];

const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const DELIVERY_STATUS = {
  ASSIGNED: 'Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
};

const NOTIFICATION_TYPES = {
  ORDER: 'order',
  DELIVERY: 'delivery',
  STOCK: 'stock',
  SYSTEM: 'system',
  PRICE: 'price',
};

const PLATFORM_COMMISSION_RATE = 6;

module.exports = {
  ROLES,
  PRODUCT_CATEGORIES,
  UNITS,
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  PAYMENT_STATUS,
  DELIVERY_STATUS,
  NOTIFICATION_TYPES,
  PLATFORM_COMMISSION_RATE,
};
