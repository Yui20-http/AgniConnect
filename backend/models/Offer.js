const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    askingPricePerUnit: { type: Number, required: true, min: 0 },
    counterPricePerUnit: { type: Number, default: null, min: 0 },
    message: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['Pending', 'Countered', 'Accepted', 'Rejected', 'Expired', 'Ordered'], default: 'Pending', index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offer', offerSchema);
