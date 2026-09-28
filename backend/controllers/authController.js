const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { sendMail, createOtp, createToken } = require('../utils/email');
const { ROLES } = require('../config/constants');

const sendVerificationEmail = async (user) => {
  const token = createToken();
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

  await sendMail({
    to: user.email,
    subject: 'Verify your AgriConnect account',
    text: `Use this link to verify your email: ${verificationUrl}`,
    html: `<p>Hi ${user.name},</p><p>Click <a href="${verificationUrl}">here</a> to verify your AgriConnect account.</p>`,
  });
};

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
    emailVerified: false,
  });

  try {
    await sendVerificationEmail(user);
  } catch (error) {
    console.warn('Verification email could not be sent:', error.message);
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email.',
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
      address: user.address,
      location: user.location,
      emailVerified: user.emailVerified,
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
      upiId: user.upiId,
      address: user.address,
      location: user.location,
      profileImage: user.profileImage,
      vehicleType: user.vehicleType,
      vehicleNumber: user.vehicleNumber,
      emailVerified: user.emailVerified,
      token: generateToken(user._id),
    },
  });
});

const requestEmailVerification = asyncHandler(async (req, res) => {
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

  await sendVerificationEmail(user);
  res.json({ success: true, message: 'Verification email sent successfully' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) {
    res.status(400);
    throw new Error('Verification token and email are required');
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification token');
  }

  user.emailVerified = true;
  user.emailVerificationToken = '';
  user.emailVerificationExpires = null;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully' });
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

  await sendMail({
    to: user.email,
    subject: 'AgriConnect password reset OTP',
    text: `Your OTP for password reset is ${otp}. It expires in 15 minutes.`,
    html: `<p>Your OTP for password reset is <strong>${otp}</strong>. It expires in 15 minutes.</p>`,
  });

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
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
};
