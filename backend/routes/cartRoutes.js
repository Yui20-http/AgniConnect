const express = require('express');
const router = express.Router();
const { getCart, getCartQuote, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('buyer'));

router.get('/', getCart);
router.post('/quote', getCartQuote);
router.post('/', addToCart);
router.delete('/', clearCart);
router.put('/:productId', updateCartItem);
router.delete('/:productId', removeFromCart);

module.exports = router;
