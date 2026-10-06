const User = require('../models/User');
const Wishlist = require('../models/Wishlist');
const asyncHandler = require('../utils/asyncHandler');
const { recordAudit } = require('../utils/auditLog');

/**
 * @desc    Update the logged-in user's profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const fields = [
    'name',
    'phone',
    'address',
    'location',
    'farmName',
    'farmLocation',
    'farmSizeAcres',
    'farmingType',
    'cropCategories',
    'yearsOfExperience',
    'upiId',
    'vehicleType',
    'vehicleNumber',
    'profileImage',
    'isAvailable',
  ];

  fields.forEach((field) => {
    if (req.body[field] === undefined) return;

    if (field === 'farmSizeAcres') user[field] = Number(req.body[field]) || 0;
    else if (field === 'yearsOfExperience') user[field] = Number(req.body[field]) || 0;
    else if (field === 'cropCategories') {
      user[field] = Array.isArray(req.body[field])
        ? req.body[field]
        : typeof req.body[field] === 'string'
          ? req.body[field].split(',').map((item) => item.trim()).filter(Boolean)
          : [];
    } else {
      user[field] = req.body[field];
    }
  });

  // Allow password change.
  if (user.role === 'farmer' && !user.upiId) {
    res.status(400);
    throw new Error('UPI ID is required for farmers');
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updated = await user.save();
  res.json({ success: true, message: 'Profile updated', data: updated });
});

/**
 * @desc    Get a public profile of a farmer (used on product pages)
 * @route   GET /api/users/farmer/:id
 * @access  Public
 */
const getFarmerProfile = asyncHandler(async (req, res) => {
  const farmer = await User.findOne({ _id: req.params.id, role: 'farmer' }).select(
    'name farmName farmLocation location address phone profileImage rating upiId createdAt'
  );
  if (!farmer) {
    res.status(404);
    throw new Error('Farmer not found');
  }
  res.json({ success: true, data: farmer });
});

const submitKyc = asyncHandler(async (req, res) => {
  const { documentType, lastFour, supportingDocumentType, supportingLastFour, consent } = req.body || {};
  const role = req.user.role;
  const identityTypes = ['Aadhaar', 'Voter ID', 'Driving Licence', 'Passport', 'Other government ID'];
  const supportingTypesByRole = {
    farmer: ['Land record', 'Lease agreement', 'FPO registration', 'Other farm document'],
    buyer: ['Utility bill', 'Bank statement', 'Ration card', 'Other address document'],
    delivery: ['Vehicle registration certificate', 'Commercial permit', 'Other vehicle document'],
  };

  if (!supportingTypesByRole[role]) {
    res.status(403);
    throw new Error('KYC is available for farmer, buyer, and delivery accounts');
  }
  if (!identityTypes.includes(documentType) || !/^[A-Za-z0-9]{4}$/.test(String(lastFour || ''))) {
    res.status(400);
    throw new Error('Choose a valid identity document and enter only its last four characters');
  }
  if (!supportingTypesByRole[role].includes(supportingDocumentType) || !/^[A-Za-z0-9]{4}$/.test(String(supportingLastFour || ''))) {
    res.status(400);
    throw new Error('Choose the required supporting document and enter only its last four characters');
  }
  if (consent !== true) {
    res.status(400);
    throw new Error('Confirm that the information is accurate before submitting');
  }
  if (!req.user.address?.trim() || !req.user.location?.trim()) {
    res.status(400);
    throw new Error('Complete your address and location in your profile before submitting KYC');
  }
  if (role === 'farmer' && (!req.user.farmName?.trim() || !req.user.farmLocation?.trim())) {
    res.status(400);
    throw new Error('Complete your farm name and location in your profile before submitting KYC');
  }
  if (role === 'delivery' && (!req.user.vehicleType?.trim() || !req.user.vehicleNumber?.trim())) {
    res.status(400);
    throw new Error('Complete your vehicle type and registration number in your profile before submitting KYC');
  }
  if (req.user.kycStatus === 'verified') {
    res.status(409);
    throw new Error('Your account is already verified. Contact support if your details have changed.');
  }

  req.user.kycDocumentType = documentType;
  req.user.kycLastFour = String(lastFour).toUpperCase();
  req.user.kycSupportingDocumentType = supportingDocumentType;
  req.user.kycSupportingLastFour = String(supportingLastFour).toUpperCase();
  req.user.kycConsentAt = new Date();
  req.user.kycStatus = 'pending';
  req.user.kycSubmittedAt = new Date();
  req.user.kycReviewedAt = null;
  req.user.kycReviewNote = '';
  const updated = await req.user.save();
  recordAudit(req, `${role}.kyc.submitted`, 'User', updated._id, `Document types: ${documentType}, ${supportingDocumentType}`);
  res.json({ success: true, message: 'Verification request submitted for admin review', data: updated });
});

const getFeaturedFarmers = asyncHandler(async (_req, res) => {
  const farmers = await User.find({ role: 'farmer', isFeatured: true, kycStatus: 'verified', isActive: true })
    .select('name farmName farmLocation location profileImage rating createdAt')
    .sort({ rating: -1, name: 1 })
    .limit(12);
  res.json({ success: true, data: farmers });
});

/**
 * @desc    List all delivery partners available for assignment
 * @route   GET /api/users/delivery-partners
 * @access  Private
 */
const getDeliveryPartners = asyncHandler(async (req, res) => {
  const partners = await User.find({ role: 'delivery', isActive: true, isAvailable: true, kycStatus: 'verified' }).select(
    'name email phone vehicleType vehicleNumber isAvailable isActive location'
  );
  res.json({ success: true, data: partners });
});

const toggleFavoriteFarmer = asyncHandler(async (req, res) => {
  const { farmerId } = req.params;
  const farmer = await User.findOne({ _id: farmerId, role: 'farmer' });

  if (!farmer) {
    res.status(404);
    throw new Error('Farmer not found');
  }

  const existing = await Wishlist.findOne({ buyer: req.user._id, farmer: farmerId });
  if (existing) {
    await existing.deleteOne();
    return res.json({ success: true, message: 'Farmer removed from favorites', data: { favorited: false } });
  }

  const favorite = await Wishlist.create({ buyer: req.user._id, farmer: farmerId });
  return res.status(201).json({ success: true, message: 'Farmer added to favorites', data: { favorited: true, favorite } });
});

const getFavoriteFarmers = asyncHandler(async (req, res) => {
  const favorites = await Wishlist.find({ buyer: req.user._id }).populate(
    'farmer',
    'name farmName farmLocation location profileImage rating'
  );

  const data = favorites.map((item) => item.farmer).filter(Boolean);
  res.json({ success: true, data });
});

module.exports = {
  updateProfile,
  getFarmerProfile,
  submitKyc,
  getFeaturedFarmers,
  getDeliveryPartners,
  toggleFavoriteFarmer,
  getFavoriteFarmers,
};
