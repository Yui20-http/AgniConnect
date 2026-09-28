const express = require('express');
const router = express.Router();
const {
  updateProfile,
  getFarmerProfile,
  getDeliveryPartners,
  toggleFavoriteFarmer,
  getFavoriteFarmers,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateProfile);
router.get('/farmer/:id', getFarmerProfile);
router.get('/delivery-partners', protect, getDeliveryPartners);
router.get('/favorites', protect, getFavoriteFarmers);
router.post('/favorites/:farmerId', protect, toggleFavoriteFarmer);

module.exports = router;
