import { Link } from 'react-router-dom';
import { Package, MapPin, Calendar, ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatCurrency, formatDate } from '../utils/helpers';

/**
 * OrderCard - compact order summary used in order lists.
 */
const OrderCard = ({ order, role = 'buyer', actions }) => {
  const counterpart = role === 'farmer' ? order.buyer : order.farmer;

  return (
    <div className="card p-4 hover:shadow-card-hover transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{order.orderNumber}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">{role === 'farmer' ? 'Buyer' : 'Farmer'}</p>
          <p className="font-medium text-gray-700 truncate">{counterpart?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Items</p>
          <p className="font-medium text-gray-700">{order.items?.length || 0} item(s)</p>
        </div>
      </div>

      {order.deliveryAddress && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{order.deliveryAddress}</span>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-primary-700">{formatCurrency(order.grandTotal)}</p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Link
            to={`/${role}/orders/${order._id}`}
            className="btn-secondary !py-1.5 !px-3 text-xs"
          >
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
