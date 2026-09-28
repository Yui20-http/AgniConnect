const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const asyncHandler = require('../utils/asyncHandler');

const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { type: 'product', product: productId } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const product = await Product.findById(productId);
  if (!product) return;

  const avgRating = stats[0]?.avgRating || 0;
  product.rating = Number(avgRating.toFixed(1));
  product.reviewCount = stats[0]?.count || 0;
  await product.save();
};

const updateFarmerRating = async (farmerId) => {
  const stats = await Review.aggregate([
    { $match: { type: 'farmer', farmer: farmerId } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const farmer = await User.findById(farmerId);
  if (!farmer) return;

  const avgRating = stats[0]?.avgRating || 0;
  farmer.rating = Number(avgRating.toFixed(1));
  await farmer.save();
};

const buyerHasPurchasedProduct = async (buyerId, productId) => {
  const orderIds = await OrderItem.find({ product: productId }).distinct('order');
  if (!orderIds.length) return false;
  const order = await Order.findOne({ _id: { $in: orderIds }, buyer: buyerId }).lean();
  return Boolean(order);
};

const buyerHasPurchasedFromFarmer = async (buyerId, farmerId) => {
  const order = await Order.findOne({ buyer: buyerId, farmer: farmerId }).lean();
  return Boolean(order);
};

const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ type: 'product', product: req.params.productId })
    .populate('buyer', 'name profileImage')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: reviews });
});

const addProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.productId;

  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const verifiedBuyer = await buyerHasPurchasedProduct(req.user._id, productId);
  const existing = await Review.findOne({ buyer: req.user._id, product: productId, type: 'product' });

  const review = existing
    ? Object.assign(existing, {
        rating: Number(rating),
        comment: comment || '',
        verifiedBuyer,
      })
    : await Review.create({
        buyer: req.user._id,
        farmer: product.farmer,
        product: productId,
        type: 'product',
        rating: Number(rating),
        comment: comment || '',
        verifiedBuyer,
      });

  await review.save();
  await updateProductRating(productId);
  await updateFarmerRating(product.farmer);

  res.status(existing ? 200 : 201).json({ success: true, message: 'Product review saved', data: review });
});

const getFarmerReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ type: 'farmer', farmer: req.params.farmerId })
    .populate('buyer', 'name profileImage')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: reviews });
});

const addFarmerReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const farmerId = req.params.farmerId;

  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
  }

  const farmer = await User.findById(farmerId);
  if (!farmer || farmer.role !== 'farmer') {
    res.status(404);
    throw new Error('Farmer not found');
  }

  const verifiedBuyer = await buyerHasPurchasedFromFarmer(req.user._id, farmerId);
  const existing = await Review.findOne({ buyer: req.user._id, farmer: farmerId, type: 'farmer' });

  const review = existing
    ? Object.assign(existing, {
        rating: Number(rating),
        comment: comment || '',
        verifiedBuyer,
      })
    : await Review.create({
        buyer: req.user._id,
        farmer: farmerId,
        type: 'farmer',
        rating: Number(rating),
        comment: comment || '',
        verifiedBuyer,
      });

  await review.save();
  await updateFarmerRating(farmerId);

  res.status(existing ? 200 : 201).json({ success: true, message: 'Farmer review saved', data: review });
});

module.exports = {
  getProductReviews,
  addProductReview,
  getFarmerReviews,
  addFarmerReview,
};
