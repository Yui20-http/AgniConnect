const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { sendMail, createOtp } = require('../utils/email');
const { ROLES } = require('../config/constants');

/**
 * @desc    Register a new user (farmer / buyer / delivery)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    farmName,
    farmLocation,
    address,
    location,
    farmSizeAcres,
    farmingType,
    cropCategories,
    yearsOfExperience,
    upiId,
    vehicleType,
    vehicleNumber,
  } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error('Please provide name, email, phone and password');
  }

  // Admin accounts cannot be self-registered.
  const allowedRoles = [ROLES.FARMER, ROLES.BUYER, ROLES.DELIVERY];
  const finalRole = allowedRoles.includes(role) ? role : ROLES.BUYER;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  if (finalRole === ROLES.FARMER && !upiId) {
    res.status(400);
    throw new Error('UPI ID is required for farmers');
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: finalRole,
    farmName: farmName || '',
    farmLocation: farmLocation || '',
    farmSizeAcres: Number(farmSizeAcres) || 0,
    farmingType: ['organic', 'conventional', 'mixed'].includes(farmingType) ? farmingType : 'organic',
    cropCategories: Array.isArray(cropCategories)
      ? cropCategories
      : typeof cropCategories === 'string'
        ? cropCategories.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
    yearsOfExperience: Number(yearsOfExperience) || 0,
    upiId: upiId || '',
    address: address || '',
    location: location || farmLocation || '',
    vehicleType: vehicleType || '',
    vehicleNumber: vehicleNumber || '',
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. You can sign in using the email and password saved to your account.',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      farmName: user.farmName,
      farmLocation: user.farmLocation,
      farmSizeAcres: user.farmSizeAcres,
      farmingType: user.farmingType,
      cropCategories: user.cropCategories,
      yearsOfExperience: user.yearsOfExperience,
      upiId: user.upiId,
      kycStatus: user.kycStatus,
      kycDocumentType: user.kycDocumentType,
      kycLastFour: user.kycLastFour,
      kycSupportingDocumentType: user.kycSupportingDocumentType,
      kycSupportingLastFour: user.kycSupportingLastFour,
      kycConsentAt: user.kycConsentAt,
      kycSubmittedAt: user.kycSubmittedAt,
      kycReviewedAt: user.kycReviewedAt,
      kycReviewNote: user.kycReviewNote,
      isFeatured: user.isFeatured,
      address: user.address,
      location: user.location,
      token: generateToken(user._id),
    },
  });
});

/**
 * @desc    Login a user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Your account has been deactivated. Please contact the admin.');
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      farmName: user.farmName,
      farmLocation: user.farmLocation,
      farmSizeAcres: user.farmSizeAcres,
      farmingType: user.farmingType,
      cropCategories: user.cropCategories,
      yearsOfExperience: user.yearsOfExperience,
      kycStatus: user.kycStatus,
      kycDocumentType: user.kycDocumentType,
      kycLastFour: user.kycLastFour,
      kycSupportingDocumentType: user.kycSupportingDocumentType,
      kycSupportingLastFour: user.kycSupportingLastFour,
      kycConsentAt: user.kycConsentAt,
      kycSubmittedAt: user.kycSubmittedAt,
      kycReviewedAt: user.kycReviewedAt,
      kycReviewNote: user.kycReviewNote,
      isFeatured: user.isFeatured,
      upiId: user.upiId,
      address: user.address,
      location: user.location,
      profileImage: user.profileImage,
      vehicleType: user.vehicleType,
      vehicleNumber: user.vehicleNumber,
      token: generateToken(user._id),
    },
  });
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const otp = createOtp();
  user.resetPasswordToken = otp;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const mailResult = await sendMail({
    to: user.email,
    subject: 'AgriConnect password reset OTP',
    text: `Your OTP for password reset is ${otp}. It expires in 15 minutes.`,
    html: `<p>Your OTP for password reset is <strong>${otp}</strong>. It expires in 15 minutes.</p>`,
  });

  if (!mailResult?.messageId && !mailResult?.accepted?.length) {
    res.status(503);
    throw new Error(mailResult?.message || 'Password reset email could not be sent. Check backend SMTP configuration.');
  }

  res.json({ success: true, message: 'Password reset OTP sent to your email' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, token, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  const user = await User.findOne({ email: email?.toLowerCase() || '' });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const validToken = token && user.resetPasswordToken === token && user.resetPasswordExpires && user.resetPasswordExpires > new Date();
  const validOtp = otp && user.resetPasswordToken === otp && user.resetPasswordExpires && user.resetPasswordExpires > new Date();

  if (!validToken && !validOtp) {
    res.status(400);
    throw new Error('Invalid or expired reset token/OTP');
  }

  user.password = newPassword;
  user.resetPasswordToken = '';
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ success: true, message: 'Password reset successful' });
});

/**
 * @desc    Get the currently logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = {
  register,
  login,
  getMe,
  requestPasswordReset,
  resetPassword,
};
