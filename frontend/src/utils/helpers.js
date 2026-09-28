/**
 * Small shared helper functions used across the frontend.
 */

// Format a number as Indian Rupees.
export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// Format a date nicely (e.g. 12 Aug 2024).
export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Format a date + time.
export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Relative time (e.g. "5 min ago").
export const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(date);
};

// Return the correct image URL (handles uploaded /uploads paths).
export const imageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return path;
};

// Colour classes for each order status badge.
export const statusColors = {
  Pending: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-blue-100 text-blue-700',
  Processing: 'bg-indigo-100 text-indigo-700',
  'Ready for Pickup': 'bg-purple-100 text-purple-700',
  'Picked Up': 'bg-cyan-100 text-cyan-700',
  'In Transit': 'bg-orange-100 text-orange-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  // delivery statuses
  Assigned: 'bg-blue-100 text-blue-700',
  Failed: 'bg-red-100 text-red-700',
};

// The order status flow used to build the tracking timeline.
export const orderStatusFlow = [
  'Pending',
  'Accepted',
  'Processing',
  'Ready for Pickup',
  'Picked Up',
  'In Transit',
  'Delivered',
];

// Category emoji icons for a friendlier UI.
export const categoryIcons = {
  Vegetables: '🥬',
  Fruits: '🍎',
  Grains: '🌾',
  Pulses: '🫘',
  Spices: '🌶️',
  Dairy: '🥛',
  Other: '🌱',
};

// Get initials from a name (for avatar fallbacks).
export const initials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Extract a readable error message from an axios error.
export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
};
