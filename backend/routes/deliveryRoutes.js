const express = require('express');
const router = express.Router();
const {
  getMyDeliveries,
  getAllDeliveries,
  getDeliveryByOrder,
  assignDelivery,
  updateDeliveryStatus,
  regenerateDeliveryOtp,
  updateDeliveryLocation,
  getDeliveryStats,
} = require('../controllers/deliveryController');
const { protect, authorize, requireVerifiedKyc } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

router.use(protect);

router.get('/my', authorize('delivery'), requireVerifiedKyc, getMyDeliveries);
router.get('/stats', authorize('delivery'), requireVerifiedKyc, getDeliveryStats);
router.get('/', authorize('admin'), getAllDeliveries);
router.post('/assign', protect, assignDelivery);
router.get('/order/:orderId', getDeliveryByOrder);
router.post('/:id/otp', authorize('buyer'), regenerateDeliveryOtp);
router.put('/:id/status', authorize('delivery', 'admin'), requireVerifiedKyc, uploadSingle('proofPhoto', 'agriconnect/delivery-proofs'), updateDeliveryStatus);
router.post('/:id/location', authorize('delivery', 'admin'), requireVerifiedKyc, updateDeliveryLocation);

module.exports = router;
