const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

/**
 * User model.
 * One collection stores all four roles (farmer, buyer, delivery, admin).
 * Role-specific fields (farmName, vehicleNumber, ...) are optional and only
 * used by the relevant role.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone must be a 10 digit number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never return password by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.BUYER,
    },
    profileImage: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    // ---- Farmer specific ----
    farmName: { type: String, default: '', trim: true },
    farmLocation: { type: String, default: '', trim: true },
    farmSizeAcres: { type: Number, default: 0, min: 0 },
    farmingType: {
      type: String,
      enum: ['organic', 'conventional', 'mixed'],
      default: 'organic',
    },
    cropCategories: { type: [String], default: [] },
    yearsOfExperience: { type: Number, default: 0, min: 0 },
    upiId: { type: String, default: '', trim: true },
    kycStatus: { type: String, enum: ['not_submitted', 'pending', 'verified', 'rejected'], default: 'not_submitted', index: true },
    kycDocumentType: { type: String, default: '' },
    kycLastFour: { type: String, default: '', maxlength: 4 },
    kycSubmittedAt: { type: Date, default: null },
    kycReviewedAt: { type: Date, default: null },
    kycReviewNote: { type: String, default: '', maxlength: 500 },
    isFeatured: { type: Boolean, default: false, index: true },
    // ---- Delivery partner specific ----
    vehicleType: { type: String, default: '', trim: true },
    vehicleNumber: { type: String, default: '', trim: true },
    isAvailable: { type: Boolean, default: true },
    courierLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    // ---- Account state ----
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
      default: '',
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

// Hash the password before saving (only when it changed).
userSchema.pre('save', async function (next) {
  if (this.role === 'farmer' && !this.upiId) {
    const err = new Error('UPI ID is required for farmers');
    return next(err);
  }

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance helper to compare a plain password with the stored hash.
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Hide sensitive fields when converting to JSON.
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
