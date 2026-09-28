import { statusColors } from '../utils/helpers';

/**
 * StatusBadge - coloured pill for order / delivery statuses.
 */
const StatusBadge = ({ status, className = '' }) => {
  const color = statusColors[status] || 'bg-gray-100 text-gray-700';
  return <span className={`badge ${color} ${className}`}>{status}</span>;
};

export default StatusBadge;
