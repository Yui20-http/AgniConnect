const User = require('../models/User');
const Wishlist = require('../models/Wishlist');
const asyncHandler = require('../utils/asyncHandler');

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

const submitFarmerKyc = asyncHandler(async (req, res) => {
  const { documentType, lastFour } = req.body || {};
  if (!documentType || !lastFour || !/^\d{4}$/.test(String(lastFour))) {
    res.status(400);
    throw new Error('Choose an identity document type and enter its last four digits');
  }
  const farmer = await User.findOne({ _id: req.user._id, role: 'farmer' });
  if (!farmer) {
    res.status(404);
    throw new Error('Farmer account not found');
  }
  farmer.kycDocumentType = String(documentType).slice(0, 40);
  farmer.kycLastFour = String(lastFour);
  farmer.kycStatus = 'pending';
  farmer.kycSubmittedAt = new Date();
  farmer.kycReviewedAt = null;
  farmer.kycReviewNote = '';
  await farmer.save();
  res.json({ success: true, message: 'Verification request submitted for admin review', data: farmer });
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
  const partners = await User.find({ role: 'delivery', isActive: true, isAvailable: true }).select(
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
  submitFarmerKyc,
  getFeaturedFarmers,
  getDeliveryPartners,
  toggleFavoriteFarmer,
  getFavoriteFarmers,
};
