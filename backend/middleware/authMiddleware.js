const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect - verifies the JWT sent in the Authorization header.
 * Attaches the logged-in user document to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User no longer exists' });
      }
      if (!req.user.isActive) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ success: false, message: 'Not authorized, no token' });
};

/**
 * authorize - role based access control.
 * Usage: router.get('/', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user ? req.user.role : 'guest'}' is not allowed to access this resource`,
      });
    }
    next();
  };
};

const requireVerifiedKyc = (req, res, next) => {
  if (!req.user || req.user.role === 'admin' || req.user.kycStatus === 'verified') return next();
  return res.status(403).json({
    success: false,
    code: 'KYC_REQUIRED',
    message: 'Complete account verification from your profile before using this feature.',
  });
};

module.exports = { protect, authorize, requireVerifiedKyc };
