const MarketPrice = require('../models/MarketPrice');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAll } = require('../utils/socket');

/**
 * @desc    Get all market prices (with optional search / location filter)
 * @route   GET /api/market-prices
 * @access  Public
 *
 * ⚠️ DEMO DATA - these are simulated prices for the college demonstration,
 * not live government (Agmarknet) rates.
 */
const getMarketPrices = asyncHandler(async (req, res) => {
  const { search, location, category } = req.query;
  const query = {};
  if (search) query.crop = { $regex: search, $options: 'i' };
  if (location) query.location = { $regex: location, $options: 'i' };
  if (category && category !== 'All') query.category = category;

  const prices = await MarketPrice.find(query).sort({ crop: 1 });
  res.json({ success: true, data: prices, isDemo: true });
});

/**
 * @desc    Get a single market price with history
 * @route   GET /api/market-prices/:id
 * @access  Public
 */
const getMarketPriceById = asyncHandler(async (req, res) => {
  const price = await MarketPrice.findById(req.params.id);
  if (!price) {
    res.status(404);
    throw new Error('Market price not found');
  }
  res.json({ success: true, data: price });
});

/**
 * @desc    Create a market price record (admin)
 * @route   POST /api/market-prices
 * @access  Private/Admin
 */
const createMarketPrice = asyncHandler(async (req, res) => {
  const { crop, category, currentPrice, unit, location } = req.body;
  if (!crop || currentPrice === undefined) {
    res.status(400);
    throw new Error('Please provide crop and current price');
  }

  const price = await MarketPrice.create({
    crop,
    category: category || 'Other',
    currentPrice: Number(currentPrice),
    previousPrice: Number(currentPrice),
    unit: unit || 'kg',
    location: location || '',
    history: [{ date: new Date(), price: Number(currentPrice) }],
    updatedBy: req.user._id,
  });

  emitToAll('marketprice:updated', price);
  res.status(201).json({ success: true, message: 'Market price added', data: price });
});

/**
 * @desc    Update a market price (admin)
 * @route   PUT /api/market-prices/:id
 * @access  Private/Admin
 */
const updateMarketPrice = asyncHandler(async (req, res) => {
  const price = await MarketPrice.findById(req.params.id);
  if (!price) {
    res.status(404);
    throw new Error('Market price not found');
  }

  if (req.body.currentPrice !== undefined) {
    price.previousPrice = price.currentPrice;
    price.currentPrice = Number(req.body.currentPrice);
    price.history.push({ date: new Date(), price: Number(req.body.currentPrice) });
  }
  if (req.body.crop) price.crop = req.body.crop;
  if (req.body.category) price.category = req.body.category;
  if (req.body.unit) price.unit = req.body.unit;
  if (req.body.location) price.location = req.body.location;
  price.updatedBy = req.user._id;

  const updated = await price.save();
  emitToAll('marketprice:updated', updated);
  res.json({ success: true, message: 'Market price updated', data: updated });
});

/**
 * @desc    Delete a market price (admin)
 * @route   DELETE /api/market-prices/:id
 * @access  Private/Admin
 */
const deleteMarketPrice = asyncHandler(async (req, res) => {
  const price = await MarketPrice.findById(req.params.id);
  if (!price) {
    res.status(404);
    throw new Error('Market price not found');
  }
  await price.deleteOne();
  res.json({ success: true, message: 'Market price deleted' });
});

module.exports = {
  getMarketPrices,
  getMarketPriceById,
  createMarketPrice,
  updateMarketPrice,
  deleteMarketPrice,
};
