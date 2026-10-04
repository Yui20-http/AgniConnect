const express = require('express');
const router = express.Router();
const {
  updateProfile,
  getFarmerProfile,
  submitFarmerKyc,
  getFeaturedFarmers,
  getDeliveryPartners,
  toggleFavoriteFarmer,
  getFavoriteFarmers,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateProfile);
router.get('/farmer/:id', getFarmerProfile);
router.get('/featured-farmers', getFeaturedFarmers);
router.post('/kyc', protect, authorize('farmer'), submitFarmerKyc);
router.get('/delivery-partners', protect, getDeliveryPartners);
router.get('/favorites', protect, authorize('buyer'), getFavoriteFarmers);
router.post('/favorites/:farmerId', protect, authorize('buyer'), toggleFavoriteFarmer);

module.exports = router;
