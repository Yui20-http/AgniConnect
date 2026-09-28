const mongoose = require('mongoose');

/**
 * MarketPrice model.
 *
 * ⚠️ DEMO / SIMULATED DATA.
 * These records are seeded with realistic-looking values for the college
 * demonstration. They are NOT live government (Agmarknet) prices. The admin
 * can update them from the admin dashboard.
 */
const marketPriceSchema = new mongoose.Schema(
  {
    crop: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: { type: String, default: 'Other' },
    currentPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    previousPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: { type: String, default: 'kg' },
    location: { type: String, default: '', index: true },
    // Historical points for the trend chart: [{ date, price }]
    history: [
      {
        date: { type: Date, default: Date.now },
        price: { type: Number },
      },
    ],
    isDemo: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Virtual: percentage change between previous and current price.
marketPriceSchema.virtual('changePercent').get(function () {
  if (!this.previousPrice) return 0;
  return Number((((this.currentPrice - this.previousPrice) / this.previousPrice) * 100).toFixed(2));
});

marketPriceSchema.set('toJSON', { virtuals: true });
marketPriceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
