const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { DELIVERY_FEE } = require('../config/constants');

/**
 * Helper: load the buyer's cart with populated products.
 */
const loadCart = async (buyerId) => {
  let cart = await Cart.findOne({ buyer: buyerId }).populate({
    path: 'items.product',
    populate: { path: 'farmer', select: 'name farmName farmLocation location upiId' },
  });
  if (!cart) {
    cart = await Cart.create({ buyer: buyerId, items: [] });
    cart = await cart.populate({
      path: 'items.product',
      populate: { path: 'farmer', select: 'name farmName farmLocation location upiId' },
    });
  }
  return cart;
};

/**
 * Build a summary (subtotal, delivery fee, total) from a populated cart.
 */
const buildSummary = (cart) => {
  let subtotal = 0;
  const items = cart.items
    .filter((item) => item.product) // ignore products that were deleted
    .map((item) => {
      const lineTotal = item.product.pricePerUnit * item.quantity;
      subtotal += lineTotal;
      return {
        product: item.product,
        quantity: item.quantity,
        lineTotal,
      };
    });

  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  return {
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
};

/**
 * @desc    Get the logged-in buyer's cart
 * @route   GET /api/cart
 * @access  Private/Buyer
 */
const getCart = asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user._id);
  res.json({ success: true, data: buildSummary(cart) });
});

/**
 * @desc    Add a product to the cart
 * @route   POST /api/cart
 * @access  Private/Buyer
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const qty = Number(quantity);

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (!product.isAvailable) {
    res.status(400);
    throw new Error('This product is currently unavailable');
  }

  const cart = await loadCart(req.user._id);
  const existing = cart.items.find((item) => String(item.product._id) === String(productId));

  const newQty = existing ? existing.quantity + qty : qty;

  if (newQty > product.quantity) {
    res.status(400);
    throw new Error(`Only ${product.quantity} ${product.unit} available in stock`);
  }
  if (newQty < product.minOrderQuantity) {
    res.status(400);
    throw new Error(`Minimum order quantity is ${product.minOrderQuantity} ${product.unit}`);
  }

  if (existing) {
    existing.quantity = newQty;
  } else {
    cart.items.push({ product: productId, quantity: qty });
  }

  await cart.save();
  const populated = await loadCart(req.user._id);
  res.json({ success: true, message: 'Added to cart', data: buildSummary(populated) });
});

/**
 * @desc    Update the quantity of a cart item
 * @route   PUT /api/cart/:productId
 * @access  Private/Buyer
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const qty = Number(quantity);

  const product = await Product.findById(req.params.productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (qty > product.quantity) {
    res.status(400);
    throw new Error(`Only ${product.quantity} ${product.unit} available in stock`);
  }
  if (qty < product.minOrderQuantity) {
    res.status(400);
    throw new Error(`Minimum order quantity is ${product.minOrderQuantity} ${product.unit}`);
  }

  const cart = await loadCart(req.user._id);
  const item = cart.items.find((i) => String(i.product._id) === String(req.params.productId));
  if (!item) {
    res.status(404);
    throw new Error('Item not in cart');
  }

  item.quantity = qty;
  await cart.save();
  const populated = await loadCart(req.user._id);
  res.json({ success: true, message: 'Cart updated', data: buildSummary(populated) });
});

/**
 * @desc    Remove a product from the cart
 * @route   DELETE /api/cart/:productId
 * @access  Private/Buyer
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user._id);
  cart.items = cart.items.filter((i) => String(i.product._id) !== String(req.params.productId));
  await cart.save();
  const populated = await loadCart(req.user._id);
  res.json({ success: true, message: 'Removed from cart', data: buildSummary(populated) });
});

/**
 * @desc    Clear the cart
 * @route   DELETE /api/cart
 * @access  Private/Buyer
 */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, message: 'Cart cleared', data: { items: [], subtotal: 0, deliveryFee: 0, total: 0 } });
});

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart, buildSummary, loadCart };
