import { useEffect, useState } from 'react';
import { Truck, MapPin, Phone, Package, Filter } from 'lucide-react';
import { deliveryService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';

const FILTERS = ['All', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];

/**
 * AdminLogistics - overview of all deliveries across the platform.
 */
const AdminLogistics = () => {
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await deliveryService.getAll();
        setDeliveries(data.data);
      } catch (err) {
        toast.error('Could not load deliveries');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = filter === 'All' ? deliveries : deliveries.filter((d) => d.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Logistics Overview</h2>
          <p className="text-sm text-gray-500">{filtered.length} delivery record(s)</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input !py-2 sm:w-44">
            {FILTERS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullScreen label="Loading logistics..." />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Truck} title="No deliveries found" message="No delivery records match this filter." />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map((d) => (
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

              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Pickup</p>
                  <p className="font-medium text-gray-800 truncate">
                    {d.farmer?.farmName || d.farmer?.name || 'Farmer'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{d.pickupLocation}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Deliver To</p>
                  <p className="font-medium text-gray-800 truncate">{d.buyer?.name || 'Buyer'}</p>
                  <p className="text-xs text-gray-500 truncate">{d.deliveryLocation}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Truck className="w-4 h-4 text-primary-600" />
                  {d.deliveryPartner ? (
                    <span>
                      {d.deliveryPartner.name}
                      {d.deliveryPartner.vehicleNumber ? ` · ${d.deliveryPartner.vehicleNumber}` : ''}
                    </span>
                  ) : (
                    <span className="text-amber-600">Awaiting assignment</span>
                  )}
                </div>
                <span className="font-bold text-primary-700">
                  {formatCurrency(d.order?.grandTotal || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLogistics;
