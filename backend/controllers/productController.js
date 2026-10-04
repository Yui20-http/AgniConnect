const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAll } = require('../utils/socket');
const { geocodeLocation } = require('../utils/geo');

const distanceKm = (a, b) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const parseBulkPricing = (value) => {
  if (value === undefined || value === null || value === '') return [];
  let tiers = value;
  if (typeof tiers === 'string') {
    try {
      tiers = JSON.parse(tiers);
    } catch {
      const error = new Error('Bulk pricing must be valid JSON tier data');
      error.statusCode = 400;
      throw error;
    }
  }
  if (!Array.isArray(tiers)) {
    const error = new Error('Bulk pricing must be a list of quantity and price tiers');
    error.statusCode = 400;
    throw error;
  }
  return tiers.map((tier) => ({ minQty: Number(tier.minQty), pricePerUnit: Number(tier.pricePerUnit) }));
};

const validatePreOrderSchedule = (isPreOrder, harvestDate) => {
  if (!isPreOrder) return;
  const date = new Date(harvestDate);
  if (!harvestDate || Number.isNaN(date.getTime()) || date <= new Date()) {
    const error = new Error('Pre-orders require a valid future harvest date');
    error.statusCode = 400;
    throw error;
  }
};

/**
 * @desc    Get all products with search, filter, sort and pagination
 * @route   GET /api/products
 * @access  Public
 *
 * Query params:
 *   search, category, location, farmer, minPrice, maxPrice,
 *   sort (price_asc | price_desc | newest | popular), page, limit, available
 */
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, location, farmer, minPrice, maxPrice, sort, page = 1, limit = 12, available, organicOnly, freshnessDays, nearLat, nearLng, radiusKm } = req.query;

  const query = {};

  if (search) {
    // Search across product name, description, location and farmer name.
    const matchingFarmers = await User.find({
      role: 'farmer',
      name: { $regex: search, $options: 'i' },
    }).select('_id');
    const farmerIds = matchingFarmers.map((f) => f._id);

    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { farmer: { $in: farmerIds } },
    ];
  }

  if (category && category !== 'All') query.category = category;
  if (location) query.location = { $regex: location, $options: 'i' };
  if (farmer) query.farmer = farmer;
  if (available === 'true') query.isAvailable = true;
  if (available === 'false') query.isAvailable = false;

  if (organicOnly === 'true') {
    const organicFarmers = await User.find({ role: 'farmer', farmingType: 'organic' }).select('_id').lean();
    const organicIds = organicFarmers.map((record) => String(record._id));
    if (query.farmer) {
      if (!organicIds.includes(String(query.farmer))) query.farmer = { $in: [] };
    } else {
      query.farmer = { $in: organicFarmers.map((record) => record._id) };
    }
  }

  const freshnessWindow = Number(freshnessDays);
  if (Number.isFinite(freshnessWindow) && freshnessWindow > 0) {
    const now = new Date();
    const earliestHarvest = new Date(now.getTime() - freshnessWindow * 24 * 60 * 60 * 1000);
    query.harvestDate = { $gte: earliestHarvest, $lte: now };
  }

  const verifiedFarmerIds = (await User.find({ role: 'farmer', kycStatus: 'verified' }).select('_id').lean()).map((farmer) => farmer._id);
  if (query.farmer) {
    if (!verifiedFarmerIds.some((id) => String(id) === String(query.farmer))) query.farmer = { $in: [] };
  } else {
    query.farmer = { $in: verifiedFarmerIds };
  }

  const hasNearPoint = nearLat !== undefined || nearLng !== undefined || radiusKm !== undefined;
  const origin = { lat: Number(nearLat), lng: Number(nearLng) };
  const radius = Number(radiusKm);
  if (hasNearPoint && (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng) || !Number.isFinite(radius) || radius <= 0 || radius > 500)) {
    res.status(400);
    throw new Error('Provide valid nearLat, nearLng and radiusKm (up to 500 km)');
  }

  if (minPrice || maxPrice) {
    query.pricePerUnit = {};
    if (minPrice) query.pricePerUnit.$gte = Number(minPrice);
    if (maxPrice) query.pricePerUnit.$lte = Number(maxPrice);
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { pricePerUnit: 1 };
  if (sort === 'price_desc') sortOption = { pricePerUnit: -1 };
  if (sort === 'newest') sortOption = { createdAt: -1 };
  if (sort === 'popular') sortOption = { soldCount: -1 };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  let products;
  let total;
  if (hasNearPoint) {
    const candidates = await Product.find(query)
      .populate('farmer', 'name farmName farmLocation location phone profileImage rating upiId farmingType')
      .sort(sortOption)
      .lean();
    const nearby = candidates.flatMap((product) => {
      const productCoordinates = product.coordinates;
      const lat = productCoordinates?.lat != null ? Number(productCoordinates.lat) : geocodeLocation(product.location || product.farmer?.farmLocation || product.farmer?.location)?.lat;
      const lng = productCoordinates?.lng != null ? Number(productCoordinates.lng) : geocodeLocation(product.location || product.farmer?.farmLocation || product.farmer?.location)?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      const distance = distanceKm(origin, { lat, lng });
      return distance <= radius ? [{ ...product, coordinates: { lat, lng }, distanceKm: Number(distance.toFixed(1)) }] : [];
    });
    total = nearby.length;
    products = nearby.slice(skip, skip + limitNum);
  } else {
    [products, total] = await Promise.all([
      Product.find(query)
        .populate('farmer', 'name farmName farmLocation location phone profileImage rating upiId farmingType')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
    ]);
  }

  products = products.map((record) => {
    const product = typeof record.toObject === 'function' ? record.toObject() : record;
    const coordinates = product.coordinates || {};
    if (coordinates.lat == null || coordinates.lng == null) {
      const locationCoordinates = geocodeLocation(product.location || product.farmer?.farmLocation || product.farmer?.location);
      if (locationCoordinates) product.coordinates = locationCoordinates;
    }
    return product;
  });

  res.json({
    success: true,
    data: products,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    },
  });
});

/**
 * @desc    Get a single product by id
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    'farmer',
    'name farmName farmLocation location address phone profileImage rating upiId farmingType createdAt kycStatus'
  );
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (product.farmer?.kycStatus !== 'verified') {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json({ success: true, data: product });
});

/**
 * @desc    Get all products belonging to the logged-in farmer
 * @route   GET /api/products/farmer/my-products
 * @access  Private/Farmer
 */
const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: products });
});

/**
 * @desc    Create a product
 * @route   POST /api/products
 * @access  Private/Farmer
 */
const createProduct = asyncHandler(async (req, res) => {
  if (req.user.kycStatus !== 'verified') {
    res.status(403);
    throw new Error('Complete farmer verification before creating product listings');
  }
  const { name, category, description, quantity, unit, pricePerUnit, minOrderQuantity, harvestDate, location, isAvailable, isPreOrder, coordinates, bulkPricing } = req.body;

  if (!name || !category || quantity === undefined || !pricePerUnit) {
    res.status(400);
    throw new Error('Please provide name, category, quantity and price');
  }

  const uploadedImage = req.fileUrl || (req.file && req.file.path) || req.body.image || '';
  const preOrder = isPreOrder === 'true' || isPreOrder === true;
  validatePreOrderSchedule(preOrder, harvestDate);
  let providedCoordinates = coordinates || req.body.coordinates;
  if (typeof providedCoordinates === 'string') {
    try { providedCoordinates = JSON.parse(providedCoordinates); } catch { providedCoordinates = null; }
  }
  const productLocation = location || req.user.farmLocation || req.user.location || '';
  const parsedBulkPricing = parseBulkPricing(bulkPricing);
  if (parsedBulkPricing.some((tier) => !Number.isInteger(tier.minQty) || tier.minQty < 1 || !Number.isFinite(tier.pricePerUnit) || tier.pricePerUnit < 0)) {
    res.status(400);
    throw new Error('Each wholesale tier needs a positive whole quantity and a non-negative price');
  }

  const product = await Product.create({
    farmer: req.user._id,
    name,
    category,
    description: description || '',
    image: uploadedImage,
    quantity: Number(quantity),
    unit: unit || 'kg',
    pricePerUnit: Number(pricePerUnit),
    minOrderQuantity: Number(minOrderQuantity) || 1,
    bulkPricing: parsedBulkPricing,
    harvestDate: harvestDate || undefined,
    isPreOrder: preOrder,
    location: productLocation,
    isAvailable: isAvailable === undefined ? true : isAvailable === 'true' || isAvailable === true,
    coordinates: providedCoordinates || geocodeLocation(productLocation) || { lat: null, lng: null },
  });

  emitToAll('product:updated', { action: 'created', productId: product._id });

  res.status(201).json({ success: true, message: 'Product added successfully', data: product });
});

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private/Farmer (owner) or Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Only the owner farmer or an admin may edit.
  if (req.user.role !== 'admin' && String(product.farmer) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only edit your own products');
  }
  if (req.user.role === 'farmer' && req.user.kycStatus !== 'verified' && (req.body.isAvailable === undefined || req.body.isAvailable === 'true' || req.body.isAvailable === true)) {
    res.status(403);
    throw new Error('Complete farmer verification before publishing or reactivating listings');
  }

  const fields = ['name', 'category', 'description', 'quantity', 'unit', 'pricePerUnit', 'minOrderQuantity', 'harvestDate', 'location', 'isAvailable', 'isPreOrder', 'coordinates'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'isAvailable' || field === 'isPreOrder') {
        product[field] = req.body[field] === 'true' || req.body[field] === true;
      } else if (['quantity', 'pricePerUnit', 'minOrderQuantity'].includes(field)) {
        product[field] = Number(req.body[field]);
      } else {
        product[field] = req.body[field];
      }
    }
  });

  validatePreOrderSchedule(product.isPreOrder, req.body.harvestDate || product.harvestDate);

  if (req.body.bulkPricing !== undefined) {
    product.bulkPricing = parseBulkPricing(req.body.bulkPricing);
    if (product.bulkPricing.some((tier) => !Number.isInteger(tier.minQty) || tier.minQty < 1 || !Number.isFinite(tier.pricePerUnit) || tier.pricePerUnit < 0)) {
      res.status(400);
      throw new Error('Each wholesale tier needs a positive whole quantity and a non-negative price');
    }
  }

  if (req.body.coordinates !== undefined) {
    try {
      product.coordinates = typeof req.body.coordinates === 'string' ? JSON.parse(req.body.coordinates) : req.body.coordinates;
    } catch {
      res.status(400);
      throw new Error('Coordinates must be valid JSON');
    }
  } else if (req.body.location) {
    product.coordinates = geocodeLocation(req.body.location) || { lat: null, lng: null };
  }

  if (req.fileUrl) product.image = req.fileUrl;
  else if (req.file && req.file.path) product.image = req.file.path;
  else if (req.body.image) product.image = req.body.image;

  const updated = await product.save();
  emitToAll('product:updated', { action: 'updated', productId: updated._id });

  res.json({ success: true, message: 'Product updated successfully', data: updated });
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private/Farmer (owner) or Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (req.user.role !== 'admin' && String(product.farmer) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only delete your own products');
  }

  await product.deleteOne();
  emitToAll('product:updated', { action: 'deleted', productId: req.params.id });

  res.json({ success: true, message: 'Product deleted successfully' });
});

/**
 * @desc    Price comparison - group products by name and list farmers
 * @route   GET /api/products/compare?name=Tomato
 * @access  Public
 */
const compareProducts = asyncHandler(async (req, res) => {
  const { name } = req.query;
  if (!name) {
    res.status(400);
    throw new Error('Please provide a product name to compare');
  }

  const products = await Product.find({
    name: { $regex: name, $options: 'i' },
  })
    .populate('farmer', 'name farmName farmLocation location rating')
    .sort({ pricePerUnit: 1 });

  res.json({ success: true, data: products });
});

/**
 * @desc    Get distinct product names (for the comparison dropdown)
 * @route   GET /api/products/names
 * @access  Public
 */
const getProductNames = asyncHandler(async (req, res) => {
  const names = await Product.distinct('name');
  res.json({ success: true, data: names.sort() });
});

/**
 * @desc    Suggest and optionally apply a market-based price to a product
 * @route   POST /api/products/:id/apply-market-price
 * @access  Private/Farmer (owner)
 */
const applyMarketPrice = asyncHandler(async (req, res) => {
  const { suggestedPrice } = req.body;
  if (!suggestedPrice || Number(suggestedPrice) <= 0) {
    res.status(400);
    throw new Error('Please provide a valid suggested price');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (String(product.farmer) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only update your own products');
  }

  product.pricePerUnit = Number(Number(suggestedPrice).toFixed(2));
  const updated = await product.save();
  emitToAll('product:updated', { action: 'updated', productId: updated._id });
  res.json({ success: true, message: 'Price updated from market reference', data: updated });
});

module.exports = {
  getProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  compareProducts,
  getProductNames,
  applyMarketPrice,
};
