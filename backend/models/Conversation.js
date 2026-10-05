const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['farmer', 'delivery'], default: 'farmer', index: true },
    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

conversationSchema.index({ buyer: 1, farmer: 1 }, { unique: true });
module.exports = mongoose.model('Conversation', conversationSchema);
