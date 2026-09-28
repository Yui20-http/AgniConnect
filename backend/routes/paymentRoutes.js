const express = require('express');
const router = express.Router();
const { initiatePayment, getFarmerPayouts, getInvoice, requestRefund } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/initiate', initiatePayment);
router.get('/payouts', authorize('farmer', 'admin'), getFarmerPayouts);
router.get('/invoice/:orderId', getInvoice);
router.post('/refund', requestRefund);

module.exports = router;
