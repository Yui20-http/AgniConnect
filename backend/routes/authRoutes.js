const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/verify-email/request', requestEmailVerification);
router.get('/verify-email', verifyEmail);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset', resetPassword);

module.exports = router;
