import { io } from 'socket.io-client';

/**
 * Socket.IO client singleton.
 *
 * By default we connect to the same origin as the app. In development Vite
 * proxies /socket.io to the backend, so no hard-coded host is needed. Set
 * VITE_SOCKET_URL to point at a different backend (e.g. in production).
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

let socket = null;

export const connectSocket = (userId) => {
  const token = localStorage.getItem('agriconnect_token');
  if (!token) return null;

  if (socket) {
    const tokenChanged = socket.auth?.token !== token;
    socket.auth = { token };
    if (tokenChanged && socket.connected) socket.disconnect().connect();
    if (socket.connected && userId) socket.emit('join', userId);
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
  });

  socket.on('connect', () => {
    if (userId) socket.emit('join', userId);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
