const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createOffer, getOffers, respondToOffer, checkoutAcceptedOffer } = require('../controllers/offerController');

router.use(protect);
router.get('/', authorize('buyer', 'farmer'), getOffers);
router.post('/', authorize('buyer'), createOffer);
router.post('/:id/checkout', authorize('buyer'), checkoutAcceptedOffer);
router.patch('/:id/respond', authorize('buyer', 'farmer'), respondToOffer);

module.exports = router;
