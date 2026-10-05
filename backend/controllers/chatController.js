const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const asyncHandler = require('../utils/asyncHandler');
const { emitToUser } = require('../utils/socket');

const getConversations = asyncHandler(async (req, res) => {
  const query = req.user.role === 'buyer'
    ? { buyer: req.user._id }
    : req.user.role === 'farmer'
      ? { farmer: req.user._id, kind: { $ne: 'delivery' } }
      : req.user.role === 'delivery'
        ? { deliveryPartner: req.user._id, kind: 'delivery' }
        : null;
  if (!query) {
    res.status(403);
    throw new Error('Chat is available to buyers and farmers');
  }
  const conversations = await Conversation.find(query)
    .populate('buyer', 'name profileImage')
    .populate('farmer', 'name farmName profileImage')
    .populate('deliveryPartner', 'name profileImage phone vehicleType vehicleNumber')
    .sort({ lastMessageAt: -1 });
  res.json({ success: true, data: conversations });
});

const startConversation = asyncHandler(async (req, res) => {
  if (req.user.role !== 'buyer') {
    res.status(403);
    throw new Error('Only buyers can start a farmer conversation');
  }
  const farmer = await User.findOne({ _id: req.params.farmerId, role: 'farmer', isActive: true }).select('_id');
  if (!farmer) {
    res.status(404);
    throw new Error('Farmer not found');
  }
  const conversation = await Conversation.findOneAndUpdate(
    { buyer: req.user._id, farmer: farmer._id },
    { $set: { kind: 'farmer' }, $setOnInsert: { buyer: req.user._id, farmer: farmer._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .populate('buyer', 'name profileImage')
    .populate('farmer', 'name farmName profileImage');
  res.status(200).json({ success: true, data: conversation });
});

const startDeliveryConversation = asyncHandler(async (req, res) => {
  if (!['buyer', 'delivery'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Only the buyer or assigned delivery partner can start this conversation');
  }
  const delivery = await Delivery.findOne({ order: req.params.orderId }).select('buyer deliveryPartner order');
  if (!delivery || !delivery.deliveryPartner) {
    res.status(404);
    throw new Error('Assigned delivery partner not found');
  }

  const isBuyer = req.user.role === 'buyer' && String(delivery.buyer) === String(req.user._id);
  const isAssignedPartner = req.user.role === 'delivery' && String(delivery.deliveryPartner) === String(req.user._id);
  if (!isBuyer && !isAssignedPartner) {
    res.status(403);
    throw new Error('Only this order\'s buyer and assigned delivery partner can start the conversation');
  }

  const conversation = await Conversation.findOneAndUpdate(
    { buyer: delivery.buyer, farmer: delivery.deliveryPartner },
    { $setOnInsert: {
      buyer: delivery.buyer,
      farmer: delivery.deliveryPartner,
      deliveryPartner: delivery.deliveryPartner,
      order: delivery.order,
      kind: 'delivery',
    } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .populate('buyer', 'name profileImage')
    .populate('deliveryPartner', 'name profileImage phone vehicleType vehicleNumber');
  res.status(200).json({ success: true, data: conversation });
});

const canAccessConversation = (conversation, user) => {
  if (String(conversation.buyer) === String(user._id)) return true;
  if (conversation.kind === 'delivery') {
    return user.role === 'delivery' && String(conversation.deliveryPartner || conversation.farmer) === String(user._id);
  }
  return user.role === 'farmer' && String(conversation.farmer) === String(user._id);
};

const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }
  if (!canAccessConversation(conversation, req.user)) {
    res.status(403);
    throw new Error('Not authorized to view this conversation');
  }
  const messages = await Message.find({ conversation: conversation._id })
    .populate('sender', 'name role profileImage')
    .sort({ createdAt: 1 })
    .limit(500);
  res.json({ success: true, data: messages });
});

const sendMessage = asyncHandler(async (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body || body.length > 2000) {
    res.status(400);
    throw new Error('Message must be between 1 and 2000 characters');
  }
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }
  if (!canAccessConversation(conversation, req.user)) {
    res.status(403);
    throw new Error('Not authorized to send messages in this conversation');
  }

  const message = await Message.create({ conversation: conversation._id, sender: req.user._id, body });
  const populated = await message.populate('sender', 'name role profileImage');
  conversation.lastMessage = body;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();
  const counterpart = conversation.kind === 'delivery'
    ? (conversation.deliveryPartner || conversation.farmer)
    : conversation.farmer;
  const recipient = String(conversation.buyer) === String(req.user._id) ? counterpart : conversation.buyer;
  emitToUser(req.user._id, 'chat:message', populated);
  emitToUser(recipient, 'chat:message', populated);
  res.status(201).json({ success: true, data: populated });
});

module.exports = { getConversations, startConversation, startDeliveryConversation, getMessages, sendMessage };
