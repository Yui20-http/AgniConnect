require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const before = await User.countDocuments();
    console.log('users_before_cleanup', before);

    await User.deleteMany({ role: { $in: ['farmer', 'buyer', 'delivery'] } });
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Delivery.deleteMany({});

    const remaining = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    console.log('remaining_roles', JSON.stringify(remaining));

    await mongoose.disconnect();
    console.log('cleanup_complete');
  } catch (err) {
    console.error('cleanup_error', err.message);
    process.exit(1);
  }
})();
