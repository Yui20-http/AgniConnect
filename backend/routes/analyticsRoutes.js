const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getFarmerAnalytics } = require('../controllers/analyticsController');

router.get('/farmer', protect, authorize('farmer'), getFarmerAnalytics);

module.exports = router;
