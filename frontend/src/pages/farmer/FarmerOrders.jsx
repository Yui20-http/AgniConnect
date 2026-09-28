import { useEffect, useState } from 'react';
import { ShoppingBag, Filter } from 'lucide-react';
import { orderService } from '../../services';
import { useToast } from '../../context/ToastContext';
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
 * FarmerOrders - list of orders received by the farmer with quick actions.
 */
const FarmerOrders = () => {
  const { toast } = useToast();
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

  const updateStatus = async (order, status) => {
    try {
      setBusyId(order._id);
      await orderService.updateStatus(order._id, status);
      toast.success(`Order ${order.orderNumber} marked as ${status}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update order');
    } finally {
      setBusyId(null);
    }
  };

  const nextAction = (order) => {
    switch (order.status) {
      case 'Pending':
        return { label: 'Accept', status: 'Accepted', cls: 'btn-primary' };
      case 'Accepted':
        return { label: 'Start Processing', status: 'Processing', cls: 'btn-primary' };
      case 'Processing':
        return { label: 'Ready for Pickup', status: 'Ready for Pickup', cls: 'btn-primary' };
      default:
        return null;
    }
  };

  const filtered = filter === 'All' ? orders : orders.filter((o) => o.status === filter);

  if (loading) return <LoadingSpinner fullScreen label="Loading orders..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-500">{orders.length} order(s) received</p>
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

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            message={filter === 'All' ? "You haven't received any orders yet." : `No orders with status "${filter}".`}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => {
            const action = nextAction(o);
            return (
              <OrderCard
                key={o._id}
                order={o}
                role="farmer"
                actions={
                  action && (
                    <button
                      onClick={() => updateStatus(o, action.status)}
                      disabled={busyId === o._id}
                      className={`${action.cls} !py-1.5 !px-3 text-xs`}
                    >
                      {busyId === o._id ? '...' : action.label}
                    </button>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FarmerOrders;
