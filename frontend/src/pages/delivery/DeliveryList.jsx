import { useEffect, useState } from 'react';
import { Truck, MapPin, Phone, Package, Filter, Navigation } from 'lucide-react';
import { deliveryService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/helpers';

const FILTERS = ['All', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];

/**
 * DeliveryList - the delivery partner's workflow: pick up, transit, deliver.
 */
const DeliveryList = () => {
  const { toast } = useToast();
  const { socket } = useSocket();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await deliveryService.getMy();
      setDeliveries(data.data);
    } catch (err) {
      toast.error('Could not load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when a new delivery is assigned in real time.
  useEffect(() => {
    if (!socket) return;
    const handler = () => load();
    socket.on('delivery:assigned', handler);
    return () => socket.off('delivery:assigned', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const updateStatus = async (delivery, status) => {
    try {
      setBusyId(delivery._id);
      await deliveryService.updateStatus(delivery._id, status);
      toast.success(`Marked as ${status}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update delivery');
    } finally {
      setBusyId(null);
    }
  };

  const nextAction = (d) => {
    switch (d.status) {
      case 'Assigned':
        return { label: 'Mark Picked Up', status: 'Picked Up' };
      case 'Picked Up':
        return { label: 'Start Transit', status: 'In Transit' };
      case 'In Transit':
        return { label: 'Mark Delivered', status: 'Delivered' };
      default:
        return null;
    }
  };

  const filtered = filter === 'All' ? deliveries : deliveries.filter((d) => d.status === filter);

  if (loading) return <LoadingSpinner fullScreen label="Loading deliveries..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Deliveries</h2>
          <p className="text-sm text-gray-500">{deliveries.length} assignment(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input !py-2 sm:w-44">
            {FILTERS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Truck}
            title="No deliveries found"
            message={filter === 'All' ? 'You have no assigned deliveries yet.' : `No deliveries with status "${filter}".`}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map((d) => {
            const action = nextAction(d);
            return (
              <div key={d._id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{d.order?.orderNumber || 'Order'}</p>
                      <p className="text-xs text-gray-500">{formatDate(d.createdAt)}</p>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Pickup from</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {d.farmer?.farmName || d.farmer?.name || 'Farmer'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{d.pickupLocation}</p>
                      {d.farmer?.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {d.farmer.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-earth-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Navigation className="w-3.5 h-3.5 text-earth-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Deliver to</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {d.buyer?.name || 'Buyer'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{d.deliveryLocation}</p>
                      {d.buyer?.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {d.buyer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Order Value</p>
                    <p className="font-bold text-primary-700">
                      {formatCurrency(d.order?.grandTotal || 0)}
                    </p>
                  </div>
                  {action ? (
                    <button
                      onClick={() => updateStatus(d, action.status)}
                      disabled={busyId === d._id}
                      className="btn-primary !py-2"
                    >
                      {busyId === d._id ? 'Updating...' : action.label}
                    </button>
                  ) : (
                    <span className="badge bg-green-100 text-green-700">Completed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveryList;
