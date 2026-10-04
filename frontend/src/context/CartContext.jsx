import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cartService } from '../services';
import { useAuth } from './useAuth';

const CartContext = createContext(null);

/**
 * CartProvider keeps the buyer's cart in sync with the backend.
 * Only buyers have a cart, so it stays empty for other roles.
 */
export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, deliveryFee: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.role !== 'buyer') {
      setCart({ items: [], subtotal: 0, deliveryFee: 0, total: 0 });
      return;
    }
    try {
      setLoading(true);
      const { data } = await cartService.get();
      setCart(data.data);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = async (productId, quantity = 1) => {
    const { data } = await cartService.add(productId, quantity);
    setCart(data.data);
    return data;
  };

  const updateQuantity = async (productId, quantity) => {
    const { data } = await cartService.update(productId, quantity);
    setCart(data.data);
    return data;
  };

  const removeFromCart = async (productId) => {
    const { data } = await cartService.remove(productId);
    setCart(data.data);
    return data;
  };

  const clearCart = async () => {
    const { data } = await cartService.clear();
    setCart(data.data);
    return data;
  };

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, loading, itemCount, addToCart, updateQuantity, removeFromCart, clearCart, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
