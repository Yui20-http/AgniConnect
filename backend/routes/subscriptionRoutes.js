const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createSubscription, getSubscriptions, updateSubscription } = require('../controllers/subscriptionController');

router.use(protect);
router.get('/', authorize('buyer', 'farmer'), getSubscriptions);
router.post('/', authorize('buyer'), createSubscription);
router.patch('/:id', authorize('buyer', 'farmer'), updateSubscription);

module.exports = router;
