const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getProductReviews,
  addProductReview,
  getFarmerReviews,
  addFarmerReview,
} = require('../controllers/reviewController');

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', protect, authorize('buyer'), addProductReview);

router.get('/farmer/:farmerId', getFarmerReviews);
router.post('/farmer/:farmerId', protect, authorize('buyer'), addFarmerReview);

module.exports = router;
