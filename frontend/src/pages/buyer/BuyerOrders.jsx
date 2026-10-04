import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Filter, Store, MapPin } from 'lucide-react';
import { orderService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import OrderCard from '../../components/OrderCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const STATUSES = [
  'All',
  'Pending',
  'Accepted',
  'Processing',
  'Ready for Pickup',
  'Picked Up',
  'In Transit',
  'Delivered',
  'Cancelled',
];

/**
 * BuyerOrders - list of the buyer's orders with cancel + track actions.
 */
const BuyerOrders = () => {
  const { toast } = useToast();
  const { lastOrderUpdate } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await orderService.getAll();
      setOrders(data.data);
    } catch (err) {
      toast.error('Could not load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh the list whenever a real-time order update arrives.
  useEffect(() => {
    if (lastOrderUpdate) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOrderUpdate]);

  const cancelOrder = async (order) => {
    try {
      setBusyId(order._id);
      const response = await orderService.cancel(order._id, 'Cancelled by buyer');
      toast.success(response.data?.message || `Order ${order.orderNumber} cancelled`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not cancel order');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = filter === 'All' ? orders : orders.filter((o) => o.status === filter);

  if (loading) return <LoadingSpinner fullScreen label="Loading orders..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
          <p className="text-sm text-gray-500">{orders.length} order(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input !py-2 sm:w-48">
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        You can cancel before dispatch while an order is Pending, Accepted, or Processing. Paid Razorpay orders are refunded to the original payment method; Cash on Delivery orders have no payment to refund. Contact support for dispatched or delivered orders.
      </p>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            message={filter === 'All' ? "You haven't placed any orders yet." : `No orders with status "${filter}".`}
            action={
              filter === 'All' && (
                <Link to="/marketplace" className="btn-primary">
                  <Store className="w-4 h-4" /> Browse Marketplace
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => (
            <div key={o._id} className="space-y-2">
              <OrderCard
                order={o}
                role="buyer"
                actions={
                  ['Pending', 'Accepted', 'Processing'].includes(o.status) && (
                    <button
                      onClick={() => cancelOrder(o)}
                      disabled={busyId === o._id}
                      className="btn bg-red-50 text-red-600 hover:bg-red-100 !py-1.5 !px-3 text-xs"
                    >
                      {busyId === o._id ? '...' : 'Cancel'}
                    </button>
                  )
                }
              />
              {['Ready for Pickup', 'Picked Up', 'In Transit', 'Delivered'].includes(o.status) && (
                <Link
                  to={`/buyer/orders/${o._id}/track`}
                  className="flex items-center justify-center gap-1.5 text-sm text-primary-600 hover:underline"
                >
                  <MapPin className="w-3.5 h-3.5" /> Track this order
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;
