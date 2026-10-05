const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getConversations, startConversation, startDeliveryConversation, getMessages, sendMessage } = require('../controllers/chatController');

router.use(protect, authorize('buyer', 'farmer', 'delivery'));
router.get('/conversations', getConversations);
router.post('/conversations/farmer/:farmerId', startConversation);
router.post('/conversations/order/:orderId/delivery', startDeliveryConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

module.exports = router;
