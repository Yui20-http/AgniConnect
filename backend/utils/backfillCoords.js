/**
 * One-off helper: backfill approximate coordinates on existing orders and
 * deliveries so the Leaflet tracking map renders for seeded data.
 * Run with: node utils/backfillCoords.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const { geocodeLocation } = require('./geo');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Backfilling coordinates...');

  const orders = await Order.find();
  let updated = 0;
  for (const order of orders) {
    const pickup = geocodeLocation(order.pickupLocation);
    const drop = geocodeLocation(order.deliveryLocation || order.deliveryAddress);
    if (pickup || drop) {
      order.coordinates = {
        pickup: pickup || { lat: null, lng: null },
        delivery: drop || { lat: null, lng: null },
      };
      await order.save();
      updated += 1;
    }
  }
  console.log(`Orders updated: ${updated}`);

  const deliveries = await Delivery.find();
  let dUpdated = 0;
  for (const d of deliveries) {
    const pickup = geocodeLocation(d.pickupLocation);
    const drop = geocodeLocation(d.deliveryLocation);
    if (pickup || drop) {
      d.coordinates = {
        pickup: pickup || { lat: null, lng: null },
        delivery: drop || { lat: null, lng: null },
      };
      await d.save();
      dUpdated += 1;
    }
  }
  console.log(`Deliveries updated: ${dUpdated}`);

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
