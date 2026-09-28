import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { connectSocket, getSocket } from '../services/socket';
import { notificationService } from '../services';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

/**
 * SocketProvider:
 *  - connects the socket for the logged-in user
 *  - listens for real-time events and updates notifications / toasts
 *  - exposes the socket instance and notification state to the app
 */
export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastOrderUpdate, setLastOrderUpdate] = useState(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationService.getAll();
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const socket = connectSocket(user._id);
    loadNotifications();

    const onNewNotification = (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
      toast.info(n.title);
    };

    const onOrderNew = (order) => {
      toast.success(`New order received: ${order.orderNumber}`);
    };

    const onOrderUpdated = (order) => {
      setLastOrderUpdate(order);
      toast.info(`Order ${order.orderNumber} is now "${order.status}"`);
    };

    const onDeliveryAssigned = () => {
      toast.success('A new delivery has been assigned to you');
    };

    const onDeliveryUpdated = (delivery) => {
      setLastOrderUpdate((prev) => prev);
      toast.info(`Delivery status: ${delivery.status}`);
    };

    socket.on('notification:new', onNewNotification);
    socket.on('order:new', onOrderNew);
    socket.on('order:updated', onOrderUpdated);
    socket.on('delivery:assigned', onDeliveryAssigned);
    socket.on('delivery:updated', onDeliveryUpdated);

    return () => {
      socket.off('notification:new', onNewNotification);
      socket.off('order:new', onOrderNew);
      socket.off('order:updated', onOrderUpdated);
      socket.off('delivery:assigned', onDeliveryAssigned);
      socket.off('delivery:updated', onDeliveryUpdated);
    };
  }, [user, loadNotifications, toast]);

  const markRead = async (id) => {
    await notificationService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <SocketContext.Provider
      value={{ socket: getSocket(), notifications, unreadCount, markRead, markAllRead, loadNotifications, lastOrderUpdate }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
