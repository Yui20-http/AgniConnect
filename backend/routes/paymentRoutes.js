const express = require('express');
const router = express.Router();
const { initiatePayment, verifyPayment, getFarmerPayouts, getInvoice, requestRefund } = require('../controllers/paymentController');
const { protect, authorize, requireVerifiedKyc } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/initiate', authorize('buyer'), requireVerifiedKyc, initiatePayment);
router.post('/verify', authorize('buyer'), verifyPayment);
router.get('/payouts', authorize('farmer', 'admin'), getFarmerPayouts);
router.get('/invoice/:orderId', getInvoice);
router.post('/refund', requestRefund);

module.exports = router;
