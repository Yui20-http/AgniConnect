import axios from 'axios';

/**
 * Central axios instance.
 * - baseURL points to the backend API.
 * - A request interceptor attaches the JWT from localStorage.
 * - A response interceptor logs the user out on 401.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agriconnect_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired / invalid - clear session.
      localStorage.removeItem('agriconnect_token');
      localStorage.removeItem('agriconnect_user');
    }
    return Promise.reject(error);
  }
);

export default api;
