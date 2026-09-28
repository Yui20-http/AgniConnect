const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

wishlistSchema.index({ buyer: 1, farmer: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
