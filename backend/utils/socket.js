/**
 * Socket.IO helper.
 *
 * The HTTP server is created in server.js and passed to initSocket().
 * Every connected client joins a room named after its user id, so the backend
 * can emit events to a specific user with io.to(userId).emit(...).
 *
 * Events emitted by the server:
 *   notification:new      -> a new notification for the user
 *   order:new             -> a new order was placed (to the farmer)
 *   order:updated         -> an order changed status (to buyer + farmer)
 *   delivery:assigned     -> a delivery partner was assigned
 *   delivery:updated      -> a delivery changed status
 *   product:updated       -> a product's stock/availability changed
 *   marketprice:updated   -> a market price was updated
 */

let io = null;

const initSocket = (httpServer) => {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id isActive');
      if (!user || !user.isActive) return next(new Error('User is not authorized'));
      socket.data.userId = String(user._id);
      return next();
    } catch (error) {
      return next(new Error('Invalid socket authentication'));
    }
  });

  io.on('connection', (socket) => {
    // Room identity comes only from the verified JWT, never from client payload.
    socket.join(socket.data.userId);
    socket.on('join', (requestedUserId) => {
      if (String(requestedUserId) === socket.data.userId) {
        socket.join(socket.data.userId);
      }
    });

    socket.on('disconnect', () => {
      // no-op, kept for clarity
    });
  });

  return io;
};

const getIO = () => io;

/**
 * Emit an event to a specific user (room = user id).
 */
const emitToUser = (userId, event, payload) => {
  if (io && userId) {
    io.to(String(userId)).emit(event, payload);
  }
};

/**
 * Broadcast an event to everyone.
 */
const emitToAll = (event, payload) => {
  if (io) io.emit(event, payload);
};

module.exports = { initSocket, getIO, emitToUser, emitToAll };
