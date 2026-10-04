import { useEffect, useState } from 'react';
import { authService } from '../services';
import { connectSocket, disconnectSocket } from '../services/socket';
import AuthContext from './authContextValue';

const safeJsonParse = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractAuthPayload = (responseData) => {
  const payload = responseData?.data ?? responseData ?? {};
  const userData = payload?.data ?? payload;
  const token = userData?.token ?? payload?.token ?? null;

  return { userData, token };
};

/**
 * AuthProvider keeps the logged-in user in state + localStorage and exposes
 * login / register / logout helpers to the whole app.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('agriconnect_user');
    return safeJsonParse(stored);
  });
  const [loading, setLoading] = useState(true);

  // On first load, verify the stored token is still valid.
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('agriconnect_token');
      if (token) {
        try {
          const { data } = await authService.me();
          const userData = data?.data ?? data ?? null;
          if (!userData) {
            throw new Error('Empty auth payload');
          }
          setUser(userData);
          localStorage.setItem('agriconnect_user', JSON.stringify(userData));
          connectSocket(userData._id);
        } catch (err) {
          localStorage.removeItem('agriconnect_token');
          localStorage.removeItem('agriconnect_user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const persist = (userData, token) => {
    if (!userData) {
      throw new Error('Missing user data after login');
    }

    if (token) {
      localStorage.setItem('agriconnect_token', token);
    }
    localStorage.setItem('agriconnect_user', JSON.stringify(userData));
    setUser(userData);
    connectSocket(userData._id);
  };

  const login = async (email, password) => {
    const { data } = await authService.login({ email, password });
    const { userData, token } = extractAuthPayload(data);
    persist(userData, token);
    return userData;
  };

  const register = async (payload) => {
    const { data } = await authService.register(payload);
    const { userData, token } = extractAuthPayload(data);
    if (token) persist(userData, token);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('agriconnect_token');
    localStorage.removeItem('agriconnect_user');
    disconnectSocket();
    setUser(null);
  };

  const updateUser = (partial) => {
    const merged = { ...user, ...partial };
    setUser(merged);
    localStorage.setItem('agriconnect_user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

