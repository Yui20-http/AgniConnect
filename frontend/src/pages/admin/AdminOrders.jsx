import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Filter, Truck, Eye, Search } from 'lucide-react';
import { orderService, userService, deliveryService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

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
 * AdminOrders - view all orders and assign delivery partners.
 */
const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [ordersRes, partnersRes] = await Promise.all([
        orderService.getAll({ limit: 200 }),
        userService.getDeliveryPartners(),
      ]);
      setOrders(ordersRes.data.data);
      setPartners(partnersRes.data.data);
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

  const handleAssign = async () => {
    if (!selectedPartner) {
      toast.warning('Please select a delivery partner');
      return;
    }
    try {
      setAssigning(true);
      await deliveryService.assign(assignTarget._id, selectedPartner);
      toast.success('Delivery partner assigned');
      setAssignTarget(null);
      setSelectedPartner('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not assign partner');
    } finally {
      setAssigning(false);
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filter === 'All' || o.status === filter;
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.buyer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.farmer?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const canAssign = (o) =>
    ['Ready for Pickup', 'Processing', 'Accepted', 'Pending'].includes(o.status) && !o.deliveryPartner;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Order Management</h2>
          <p className="text-sm text-gray-500">{filtered.length} order(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order / buyer..."
              className="input pl-9 !py-2 sm:w-56"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input !py-2 sm:w-40">
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullScreen label="Loading orders..." />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={ShoppingBag} title="No orders found" message="Try a different search or filter." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Buyer</th>
                  <th className="px-4 py-3 font-semibold">Farmer</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Delivery</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{o.orderNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.buyer?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{o.farmer?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(o.grandTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {o.deliveryPartner?.name || <span className="text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canAssign(o) && (
                          <button
                            onClick={() => setAssignTarget(o)}
                            className="btn-secondary !py-1.5 !px-2.5 text-xs"
                            title="Assign delivery partner"
                          >
                            <Truck className="w-3.5 h-3.5" /> Assign
                          </button>
                        )}
                        <Link
                          to={`/admin/orders/${o._id}`}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="Assign Delivery Partner"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-3">
          Order <strong>{assignTarget?.orderNumber}</strong>
        </p>
        <label className="label">Select Delivery Partner</label>
        <select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          className="input"
        >
          <option value="">-- Choose a partner --</option>
          {partners.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} {p.vehicleType ? `(${p.vehicleType})` : ''}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setAssignTarget(null)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleAssign} disabled={assigning} className="btn-primary">
            {assigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminOrders;
