const express = require('express');
const router = express.Router();
const {
  getMarketPrices,
  getMarketPriceById,
  createMarketPrice,
  updateMarketPrice,
  deleteMarketPrice,
} = require('../controllers/marketPriceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getMarketPrices);
router.get('/:id', getMarketPriceById);
router.post('/', protect, authorize('admin'), createMarketPrice);
router.put('/:id', protect, authorize('admin'), updateMarketPrice);
router.delete('/:id', protect, authorize('admin'), deleteMarketPrice);

module.exports = router;
