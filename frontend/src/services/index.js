import api from './api';

/**
 * All API calls grouped by resource.
 * Keeping them here means components never build URLs by hand.
 */

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  requestVerification: (email) => api.post('/auth/verify-email/request', { email }),
  verifyEmail: (token, email) => api.get('/auth/verify-email', { params: { token, email } }),
  requestPasswordReset: (email) => api.post('/auth/password-reset/request', { email }),
  resetPassword: (data) => api.post('/auth/password-reset', data),
};

export const userService = {
  updateProfile: (data) => api.put('/users/profile', data),
  getFarmer: (id) => api.get(`/users/farmer/${id}`),
  getDeliveryPartners: () => api.get('/users/delivery-partners'),
  getFavorites: () => api.get('/users/favorites'),
  toggleFavorite: (farmerId) => api.post(`/users/favorites/${farmerId}`),
};

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getMyProducts: () => api.get('/products/farmer/my-products'),
  create: (data) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/products/${id}`),
  compare: (name) => api.get('/products/compare', { params: { name } }),
  names: () => api.get('/products/names'),
};

export const cartService = {
  get: () => api.get('/cart'),
  add: (productId, quantity) => api.post('/cart', { productId, quantity }),
  update: (productId, quantity) => api.put(`/cart/${productId}`, { quantity }),
  remove: (productId) => api.delete(`/cart/${productId}`),
  clear: () => api.delete('/cart'),
};

export const orderService = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status, note) => api.put(`/orders/${id}/status`, { status, note }),
  farmerStats: () => api.get('/orders/farmer/stats'),
  buyerStats: () => api.get('/orders/buyer/stats'),
};

export const deliveryService = {
  getMy: () => api.get('/deliveries/my'),
  getAll: () => api.get('/deliveries'),
  getByOrder: (orderId) => api.get(`/deliveries/order/${orderId}`),
  assign: (orderId, deliveryPartnerId) => api.post('/deliveries/assign', { orderId, deliveryPartnerId }),
  updateStatus: (id, status, note) => api.put(`/deliveries/${id}/status`, { status, note }),
  stats: () => api.get('/deliveries/stats'),
};

export const paymentService = {
  initiate: (data) => api.post('/payments/initiate', data),
  getInvoice: (orderId) => api.get(`/payments/invoice/${orderId}`, { responseType: 'blob' }),
  getPayouts: () => api.get('/payments/payouts'),
  requestRefund: (data) => api.post('/payments/refund', data),
};

export const reviewService = {
  getProductReviews: (productId) => api.get(`/reviews/product/${productId}`),
  addProductReview: (productId, data) => api.post(`/reviews/product/${productId}`, data),
  getFarmerReviews: (farmerId) => api.get(`/reviews/farmer/${farmerId}`),
  addFarmerReview: (farmerId, data) => api.post(`/reviews/farmer/${farmerId}`, data),
};

export const notificationService = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const marketPriceService = {
  getAll: (params) => api.get('/market-prices', { params }),
  getById: (id) => api.get(`/market-prices/${id}`),
  create: (data) => api.post('/market-prices', data),
  update: (id, data) => api.put(`/market-prices/${id}`, data),
  remove: (id) => api.delete(`/market-prices/${id}`),
};

export const adminService = {
  stats: () => api.get('/admin/stats'),
  charts: () => api.get('/admin/charts'),
  users: (params) => api.get('/admin/users', { params }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
