const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { emitToUser } = require('../utils/socket');

const getConversations = asyncHandler(async (req, res) => {
  const query = req.user.role === 'buyer' ? { buyer: req.user._id } : req.user.role === 'farmer' ? { farmer: req.user._id } : null;
  if (!query) {
    res.status(403);
    throw new Error('Chat is available to buyers and farmers');
  }
  const conversations = await Conversation.find(query)
    .populate('buyer', 'name profileImage')
    .populate('farmer', 'name farmName profileImage')
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
    { $setOnInsert: { buyer: req.user._id, farmer: farmer._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .populate('buyer', 'name profileImage')
    .populate('farmer', 'name farmName profileImage');
  res.status(200).json({ success: true, data: conversation });
});

const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }
  const isParticipant = [String(conversation.buyer), String(conversation.farmer)].includes(String(req.user._id));
  if (!isParticipant) {
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
  const isParticipant = [String(conversation.buyer), String(conversation.farmer)].includes(String(req.user._id));
  if (!isParticipant) {
    res.status(403);
    throw new Error('Not authorized to send messages in this conversation');
  }

  const message = await Message.create({ conversation: conversation._id, sender: req.user._id, body });
  const populated = await message.populate('sender', 'name role profileImage');
  conversation.lastMessage = body;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();
  const recipient = String(conversation.buyer) === String(req.user._id) ? conversation.farmer : conversation.buyer;
  emitToUser(req.user._id, 'chat:message', populated);
  emitToUser(recipient, 'chat:message', populated);
  res.status(201).json({ success: true, data: populated });
});

module.exports = { getConversations, startConversation, getMessages, sendMessage };
