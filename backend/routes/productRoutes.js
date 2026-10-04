const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  compareProducts,
  getProductNames,
  applyMarketPrice,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', getProducts);
router.get('/names', getProductNames);
router.get('/compare', compareProducts);

// Farmer routes (must come before /:id to avoid conflicts)
router.get('/farmer/my-products', protect, authorize('farmer'), getMyProducts);
router.post('/', protect, authorize('farmer'), uploadSingle('image'), createProduct);

// Dynamic id routes
router.get('/:id', getProductById);
router.put('/:id', protect, authorize('farmer', 'admin'), uploadSingle('image'), updateProduct);
router.delete('/:id', protect, authorize('farmer', 'admin'), deleteProduct);
router.post('/:id/apply-market-price', protect, authorize('farmer'), applyMarketPrice);

module.exports = router;
