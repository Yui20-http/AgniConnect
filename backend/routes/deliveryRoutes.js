const express = require('express');
const router = express.Router();
const {
  getMyDeliveries,
  getAllDeliveries,
  getDeliveryByOrder,
  assignDelivery,
  updateDeliveryStatus,
  getDeliveryStats,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/my', authorize('delivery'), getMyDeliveries);
router.get('/stats', authorize('delivery'), getDeliveryStats);
router.get('/', authorize('admin'), getAllDeliveries);
router.post('/assign', protect, assignDelivery);
router.get('/order/:orderId', getDeliveryByOrder);
router.put('/:id/status', authorize('delivery', 'admin'), updateDeliveryStatus);

module.exports = router;
