const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProductReviews,
  addProductReview,
  getFarmerReviews,
  addFarmerReview,
} = require('../controllers/reviewController');

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', protect, addProductReview);

router.get('/farmer/:farmerId', getFarmerReviews);
router.post('/farmer/:farmerId', protect, addFarmerReview);

module.exports = router;
