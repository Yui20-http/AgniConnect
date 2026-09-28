/**
 * Seed script - populates the database with realistic demo data.
 *
 * Run with:  npm run seed
 *
 * Creates:
 *   - 1 Admin
 *   - 5 Farmers
 *   - 5 Buyers
 *   - 3 Delivery Partners
 *   - 20+ Products (Indian crops, Maharashtra locations)
 *   - 15+ Orders (across the full status lifecycle)
 *   - Deliveries, Notifications and Market Prices
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const MarketPrice = require('../models/MarketPrice');
const Cart = require('../models/Cart');

const { ORDER_STATUS, DELIVERY_STATUS, DELIVERY_FEE } = require('../config/constants');

const includeDemoAccounts = process.env.SEED_DEMO_ACCOUNTS === 'true';
const includeDemoProducts = process.env.SEED_DEMO_PRODUCTS === 'true';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const seed = async () => {
  await connectDB();
  console.log(includeDemoAccounts
    ? '🌱 Seeding database with demo users and demo marketplace data...'
    : '🌱 Seeding admin only. All buyer/farmer/delivery roles should register from the register page.');

  // Clear existing data.
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    OrderItem.deleteMany({}),
    Delivery.deleteMany({}),
    Notification.deleteMany({}),
    MarketPrice.deleteMany({}),
    Cart.deleteMany({}),
  ]);
  console.log('🧹 Cleared existing collections');

  // ---------------- Admin ----------------
  const admin = await User.create({
    name: process.env.ADMIN_NAME || 'AgriConnect Admin',
    email: process.env.ADMIN_EMAIL || 'admin@agriconnect.com',
    phone: process.env.ADMIN_PHONE || '9000000000',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'admin',
    location: 'Pune, Maharashtra',
    address: 'AgriConnect HQ, Pune, Maharashtra',
  });

  if (!includeDemoAccounts) {
    console.log('👤 Admin-only seed complete. The marketplace and role-specific users will be created by real registrations.');
    console.log('==============================================');
    console.log('  ADMIN LOGIN CREDENTIAL');
    console.log('==============================================');
    console.log(`  Admin : ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
    console.log('==============================================\n');
    await mongoose.connection.close();
    process.exit(0);
  }

  // ---------------- Farmers ----------------
  const farmersData = [
    { name: 'Ramesh Patil', email: 'ramesh@farmer.com', phone: '9812345601', farmName: 'Patil Krushi Farm', farmLocation: 'Nashik, Maharashtra', location: 'Nashik, Maharashtra', address: 'Gat No. 45, Dindori Road, Nashik', upiId: 'ramesh.patil@upi' },
    { name: 'Sunita Deshmukh', email: 'sunita@farmer.com', phone: '9812345602', farmName: 'Deshmukh Organic Farms', farmLocation: 'Pune, Maharashtra', location: 'Pune, Maharashtra', address: 'Survey 12, Baramati, Pune', upiId: 'sunita.deshmukh@upi' },
    { name: 'Vijay Jadhav', email: 'vijay@farmer.com', phone: '9812345603', farmName: 'Jadhav Agro', farmLocation: 'Nagpur, Maharashtra', location: 'Nagpur, Maharashtra', address: 'Katol Road, Nagpur', upiId: 'vijay.jadhav@upi' },
    { name: 'Anita Kulkarni', email: 'anita@farmer.com', phone: '9812345604', farmName: 'Kulkarni Green Fields', farmLocation: 'Kolhapur, Maharashtra', location: 'Kolhapur, Maharashtra', address: 'Shiroli, Kolhapur', upiId: 'anita.kulkarni@upi' },
    { name: 'Ganesh Shinde', email: 'ganesh@farmer.com', phone: '9812345605', farmName: 'Shinde Fresh Produce', farmLocation: 'Aurangabad, Maharashtra', location: 'Aurangabad, Maharashtra', address: 'Paithan Road, Aurangabad', upiId: 'ganesh.shinde@upi' },
  ];
  const farmers = [];
  for (const f of farmersData) {
    farmers.push(await User.create({ ...f, password: 'Farmer@123', role: 'farmer', rating: (Math.random() * 1 + 4).toFixed(1) }));
  }

  // ---------------- Buyers ----------------
  const buyersData = [
    { name: 'Priya Sharma', email: 'priya@buyer.com', phone: '9822345601', location: 'Mumbai, Maharashtra', address: 'Andheri West, Mumbai' },
    { name: 'Rahul Mehta', email: 'rahul@buyer.com', phone: '9822345602', location: 'Pune, Maharashtra', address: 'Kothrud, Pune' },
    { name: 'Sneha Joshi', email: 'sneha@buyer.com', phone: '9822345603', location: 'Thane, Maharashtra', address: 'Ghodbunder Road, Thane' },
    { name: 'Amit Verma', email: 'amit@buyer.com', phone: '9822345604', location: 'Navi Mumbai, Maharashtra', address: 'Vashi, Navi Mumbai' },
    { name: 'Kavita Nair', email: 'kavita@buyer.com', phone: '9822345605', location: 'Pune, Maharashtra', address: 'Baner, Pune' },
  ];
  const buyers = [];
  for (const b of buyersData) {
    buyers.push(await User.create({ ...b, password: 'Buyer@123', role: 'buyer' }));
  }

  // ---------------- Delivery Partners ----------------
  const deliveryData = [
    { name: 'Suresh Yadav', email: 'suresh@delivery.com', phone: '9832345601', vehicleType: 'Truck', vehicleNumber: 'MH12 AB 1234', location: 'Pune, Maharashtra' },
    { name: 'Mahesh Pawar', email: 'mahesh@delivery.com', phone: '9832345602', vehicleType: 'Tempo', vehicleNumber: 'MH14 CD 5678', location: 'Nashik, Maharashtra' },
    { name: 'Ravi Singh', email: 'ravi@delivery.com', phone: '9832345603', vehicleType: 'Mini Truck', vehicleNumber: 'MH31 EF 9012', location: 'Nagpur, Maharashtra' },
  ];
  const partners = [];
  for (const d of deliveryData) {
    partners.push(await User.create({ ...d, password: 'Delivery@123', role: 'delivery' }));
  }

  console.log(`👥 Created ${1 + farmers.length + buyers.length + partners.length} users`);

  if (!includeDemoProducts) {
    console.log('📦 Demo product listings are disabled. Marketplace will display only products added from the farmer side.');
    return;
  }

  // ---------------- Products ----------------
  const productTemplates = [
    { name: 'Tomato', category: 'Vegetables', unit: 'kg', price: [25, 40], qty: [200, 800], desc: 'Fresh farm tomatoes, ideal for daily cooking and sauces.' },
    { name: 'Onion', category: 'Vegetables', unit: 'kg', price: [20, 35], qty: [300, 1000], desc: 'Premium quality red onions with long shelf life.' },
    { name: 'Potato', category: 'Vegetables', unit: 'kg', price: [18, 30], qty: [400, 1200], desc: 'Farm fresh potatoes, perfect for all cuisines.' },
    { name: 'Brinjal', category: 'Vegetables', unit: 'kg', price: [22, 38], qty: [100, 400], desc: 'Tender purple brinjals harvested this week.' },
    { name: 'Cauliflower', category: 'Vegetables', unit: 'kg', price: [30, 45], qty: [80, 300], desc: 'Fresh cauliflower heads, crisp and white.' },
    { name: 'Mango (Alphonso)', category: 'Fruits', unit: 'dozen', price: [400, 700], qty: [50, 200], desc: 'Authentic Ratnagiri Alphonso mangoes, naturally ripened.' },
    { name: 'Banana', category: 'Fruits', unit: 'dozen', price: [40, 70], qty: [150, 500], desc: 'Sweet and ripe bananas, rich in potassium.' },
    { name: 'Grapes', category: 'Fruits', unit: 'kg', price: [60, 110], qty: [100, 400], desc: 'Seedless Nashik grapes, export quality.' },
    { name: 'Pomegranate', category: 'Fruits', unit: 'kg', price: [90, 150], qty: [60, 250], desc: 'Juicy pomegranates with deep red arils.' },
    { name: 'Rice (Basmati)', category: 'Grains', unit: 'kg', price: [55, 90], qty: [500, 2000], desc: 'Long grain aromatic basmati rice.' },
    { name: 'Wheat', category: 'Grains', unit: 'kg', price: [28, 42], qty: [600, 2500], desc: 'High quality sharbati wheat for chapatis.' },
    { name: 'Jowar', category: 'Grains', unit: 'kg', price: [32, 48], qty: [300, 1000], desc: 'Nutritious jowar (sorghum) grains.' },
    { name: 'Bajra', category: 'Grains', unit: 'kg', price: [30, 45], qty: [250, 900], desc: 'Fresh bajra (pearl millet) for healthy meals.' },
    { name: 'Tur Dal', category: 'Pulses', unit: 'kg', price: [110, 160], qty: [150, 600], desc: 'Premium toor dal, high protein.' },
    { name: 'Chana Dal', category: 'Pulses', unit: 'kg', price: [80, 120], qty: [200, 700], desc: 'Split chickpea lentils, fresh stock.' },
    { name: 'Moong Dal', category: 'Pulses', unit: 'kg', price: [95, 140], qty: [180, 650], desc: 'Green gram split lentils.' },
    { name: 'Turmeric', category: 'Spices', unit: 'kg', price: [120, 200], qty: [100, 400], desc: 'Sangli turmeric with high curcumin content.' },
    { name: 'Red Chilli', category: 'Spices', unit: 'kg', price: [150, 260], qty: [80, 350], desc: 'Spicy Guntur red chillies, sun dried.' },
    { name: 'Coriander Seeds', category: 'Spices', unit: 'kg', price: [90, 150], qty: [70, 300], desc: 'Aromatic coriander seeds.' },
    { name: 'Cumin', category: 'Spices', unit: 'kg', price: [200, 320], qty: [50, 200], desc: 'Premium quality cumin seeds.' },
    { name: 'Fresh Milk', category: 'Dairy', unit: 'litre', price: [45, 65], qty: [100, 400], desc: 'Pure cow milk, delivered fresh daily.' },
    { name: 'Paneer', category: 'Dairy', unit: 'kg', price: [280, 400], qty: [30, 120], desc: 'Soft and fresh homemade paneer.' },
    { name: 'Ghee', category: 'Dairy', unit: 'kg', price: [500, 750], qty: [20, 80], desc: 'Pure desi cow ghee, aromatic and rich.' },
    { name: 'Sugarcane', category: 'Other', unit: 'ton', price: [2500, 3500], qty: [10, 50], desc: 'Fresh sugarcane for juice and jaggery.' },
  ];

  const products = [];
  for (let i = 0; i < productTemplates.length; i++) {
    const t = productTemplates[i];
    const farmer = farmers[i % farmers.length];
    const price = rand(t.price[0], t.price[1]);
    const quantity = rand(t.qty[0], t.qty[1]);
    const product = await Product.create({
      farmer: farmer._id,
      name: t.name,
      category: t.category,
      description: t.desc,
      image: '',
      quantity,
      unit: t.unit,
      pricePerUnit: price,
      minOrderQuantity: t.unit === 'kg' ? rand(1, 5) : 1,
      harvestDate: daysAgo(rand(1, 20)),
      location: farmer.farmLocation,
      isAvailable: true,
      soldCount: rand(0, 120),
      coordinates: { lat: 18.5 + Math.random(), lng: 73.8 + Math.random() },
    });
    products.push(product);
  }
  console.log(`🥬 Created ${products.length} products`);

  // ---------------- Orders ----------------
  const statuses = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.READY_FOR_PICKUP,
    ORDER_STATUS.PICKED_UP,
    ORDER_STATUS.IN_TRANSIT,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ];

  const orders = [];
  for (let i = 0; i < 18; i++) {
    const buyer = pick(buyers);
    const product = pick(products);
    const farmer = await User.findById(product.farmer);
    const quantity = rand(product.minOrderQuantity, Math.min(20, product.quantity || 5));
    const subtotal = product.pricePerUnit * quantity;
    const grandTotal = subtotal + DELIVERY_FEE;
    const status = statuses[i % statuses.length];

    const order = await Order.create({
      buyer: buyer._id,
      farmer: farmer._id,
      totalAmount: subtotal,
      deliveryFee: DELIVERY_FEE,
      grandTotal,
      deliveryAddress: buyer.address,
      deliveryLocation: buyer.location,
      pickupLocation: farmer.farmLocation,
      paymentMethod: pick(['Cash on Delivery', 'UPI', 'Net Banking']),
      status,
      paymentStatus: status === ORDER_STATUS.DELIVERED ? 'Paid' : 'Pending',
      createdAt: daysAgo(rand(0, 13)),
      statusHistory: [{ status: ORDER_STATUS.PENDING, note: 'Order placed by buyer', at: daysAgo(rand(0, 13)) }],
    });

    const orderItem = await OrderItem.create({
      order: order._id,
      product: product._id,
      farmer: farmer._id,
      name: product.name,
      image: product.image,
      unit: product.unit,
      quantity,
      pricePerUnit: product.pricePerUnit,
      subtotal,
    });
    order.items.push(orderItem._id);

    // Assign a delivery partner for orders that are past "Ready for Pickup".
    const advanced = [ORDER_STATUS.READY_FOR_PICKUP, ORDER_STATUS.PICKED_UP, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.DELIVERED];
    if (advanced.includes(status)) {
      const partner = pick(partners);
      order.deliveryPartner = partner._id;
      await order.save();

      const deliveryStatusMap = {
        [ORDER_STATUS.READY_FOR_PICKUP]: DELIVERY_STATUS.ASSIGNED,
        [ORDER_STATUS.PICKED_UP]: DELIVERY_STATUS.PICKED_UP,
        [ORDER_STATUS.IN_TRANSIT]: DELIVERY_STATUS.IN_TRANSIT,
        [ORDER_STATUS.DELIVERED]: DELIVERY_STATUS.DELIVERED,
      };
      await Delivery.create({
        order: order._id,
        deliveryPartner: partner._id,
        farmer: farmer._id,
        buyer: buyer._id,
        pickupLocation: farmer.farmLocation,
        deliveryLocation: buyer.location,
        status: deliveryStatusMap[status],
        distanceKm: rand(20, 250),
        estimatedDelivery: new Date(Date.now() + rand(1, 3) * 24 * 60 * 60 * 1000),
        completedAt: status === ORDER_STATUS.DELIVERED ? new Date() : null,
        statusHistory: [{ status: deliveryStatusMap[status], note: 'Seeded delivery' }],
      });
    } else {
      await order.save();
    }

    orders.push(order);
  }
  console.log(`📦 Created ${orders.length} orders`);

  // ---------------- Market Prices (DEMO DATA) ----------------
  const marketTemplates = [
    { crop: 'Tomato', category: 'Vegetables', price: 32, unit: 'kg', location: 'Pune APMC' },
    { crop: 'Onion', category: 'Vegetables', price: 26, unit: 'kg', location: 'Nashik APMC' },
    { crop: 'Potato', category: 'Vegetables', price: 22, unit: 'kg', location: 'Pune APMC' },
    { crop: 'Rice (Basmati)', category: 'Grains', price: 72, unit: 'kg', location: 'Nagpur APMC' },
    { crop: 'Wheat', category: 'Grains', price: 34, unit: 'kg', location: 'Nashik APMC' },
    { crop: 'Mango (Alphonso)', category: 'Fruits', price: 550, unit: 'dozen', location: 'Ratnagiri APMC' },
    { crop: 'Banana', category: 'Fruits', price: 55, unit: 'dozen', location: 'Jalgaon APMC' },
    { crop: 'Grapes', category: 'Fruits', price: 85, unit: 'kg', location: 'Nashik APMC' },
    { crop: 'Turmeric', category: 'Spices', price: 160, unit: 'kg', location: 'Sangli APMC' },
    { crop: 'Red Chilli', category: 'Spices', price: 210, unit: 'kg', location: 'Nagpur APMC' },
    { crop: 'Tur Dal', category: 'Pulses', price: 135, unit: 'kg', location: 'Latur APMC' },
    { crop: 'Chana Dal', category: 'Pulses', price: 98, unit: 'kg', location: 'Solapur APMC' },
  ];

  const marketPrices = [];
  for (const m of marketTemplates) {
    const change = rand(-15, 15);
    const previous = m.price;
    const current = Math.max(5, Math.round(previous * (1 + change / 100)));
    // Build a small history for the trend chart.
    const history = [];
    for (let d = 6; d >= 0; d--) {
      history.push({ date: daysAgo(d), price: Math.max(5, current + rand(-8, 8)) });
    }
    history.push({ date: new Date(), price: current });

    marketPrices.push(
      await MarketPrice.create({
        crop: m.crop,
        category: m.category,
        currentPrice: current,
        previousPrice: previous,
        unit: m.unit,
        location: m.location,
        history,
        isDemo: true,
        updatedBy: admin._id,
      })
    );
  }
  console.log(`📈 Created ${marketPrices.length} market price records (DEMO DATA)`);

  // ---------------- Notifications ----------------
  const notifTemplates = [
    { user: farmers[0]._id, title: 'New order received', message: 'You received a new order worth ₹1,250.', type: 'order', link: '/farmer/orders' },
    { user: farmers[1]._id, title: 'Low stock alert', message: 'Tomato is running low (8 kg left).', type: 'stock', link: '/farmer/products' },
    { user: buyers[0]._id, title: 'Order Delivered', message: 'Your order has been delivered successfully.', type: 'order', link: '/buyer/orders' },
    { user: buyers[1]._id, title: 'Order Accepted', message: 'Your order was accepted by the farmer.', type: 'order', link: '/buyer/orders' },
    { user: partners[0]._id, title: 'New delivery assigned', message: 'You have been assigned a new delivery.', type: 'delivery', link: '/delivery/deliveries' },
    { user: admin._id, title: 'Welcome to AgriConnect', message: 'Admin dashboard is ready.', type: 'system', link: '/admin' },
  ];
  for (const n of notifTemplates) {
    await Notification.create({ ...n, isRead: false });
  }
  console.log(`🔔 Created ${notifTemplates.length} notifications`);

  console.log('\n✅ Database seeded successfully!\n');
  console.log('==============================================');
  console.log('  DEMO LOGIN CREDENTIALS');
  console.log('==============================================');
  console.log(`  Admin    : ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  console.log('  Farmer   : ramesh@farmer.com / Farmer@123');
  console.log('  Buyer    : priya@buyer.com / Buyer@123');
  console.log('  Delivery : suresh@delivery.com / Delivery@123');
  console.log('==============================================\n');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
