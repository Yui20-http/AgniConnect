const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAll } = require('../utils/socket');

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
  const { search, category, location, farmer, minPrice, maxPrice, sort, page = 1, limit = 12, available } = req.query;

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

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('farmer', 'name farmName farmLocation location phone profileImage rating upiId')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(query),
  ]);

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
    'name farmName farmLocation location address phone profileImage rating upiId createdAt'
  );
  if (!product) {
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
  const { name, category, description, quantity, unit, pricePerUnit, minOrderQuantity, harvestDate, location, isAvailable, isPreOrder, coordinates, bulkPricing } = req.body;

  if (!name || !category || quantity === undefined || !pricePerUnit) {
    res.status(400);
    throw new Error('Please provide name, category, quantity and price');
  }

  const uploadedImage = req.fileUrl || (req.file && req.file.path) || req.body.image || '';
  const parsedBulkPricing = Array.isArray(bulkPricing)
    ? bulkPricing.map((tier) => ({
        minQty: Number(tier?.minQty || 1),
        pricePerUnit: Number(tier?.pricePerUnit || 0),
      }))
    : [];

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
    isPreOrder: isPreOrder === 'true' || isPreOrder === true,
    location: location || req.user.farmLocation || req.user.location || '',
    isAvailable: isAvailable === undefined ? true : isAvailable === 'true' || isAvailable === true,
    coordinates: coordinates || { lat: null, lng: null },
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

  if (req.body.bulkPricing !== undefined) {
    product.bulkPricing = Array.isArray(req.body.bulkPricing)
      ? req.body.bulkPricing.map((tier) => ({
          minQty: Number(tier?.minQty || 1),
          pricePerUnit: Number(tier?.pricePerUnit || 0),
        }))
      : [];
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

module.exports = {
  getProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  compareProducts,
  getProductNames,
};
