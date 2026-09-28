const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderTimeline,
  getOrderById,
  updateOrderStatus,
  getFarmerStats,
  getBuyerStats,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', authorize('buyer'), createOrder);
router.get('/', getOrders);
router.get('/farmer/stats', authorize('farmer'), getFarmerStats);
router.get('/buyer/stats', authorize('buyer'), getBuyerStats);
router.get('/:id/timeline', getOrderTimeline);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/cancel', authorize('buyer', 'admin'), require('../controllers/orderController').cancelOrder);

module.exports = router;
