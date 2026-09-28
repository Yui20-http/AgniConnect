import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, PackageCheck, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { deliveryService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import DashboardCard from '../../components/DashboardCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/helpers';

/**
 * DeliveryDashboard - overview of a delivery partner's assignments.
 */
const DeliveryDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, listRes] = await Promise.all([
          deliveryService.stats(),
          deliveryService.getMy(),
        ]);
        setStats(statsRes.data.data);
        setDeliveries(listRes.data.data);
      } catch (err) {
        toast.error('Could not load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSpinner fullScreen label="Loading dashboard..." />;

  const active = deliveries.filter((d) => d.status !== 'Delivered').slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-500 text-white border-0">
        <h2 className="text-2xl font-extrabold">Hello, {user?.name?.split(' ')[0]} 🚚</h2>
        <p className="text-primary-50 mt-1">
          {user?.vehicleType ? `${user.vehicleType} · ${user.vehicleNumber || ''}` : 'Your delivery assignments at a glance.'}
        </p>
        <div className="mt-4">
          <Link to="/delivery/deliveries" className="btn bg-white text-primary-700 hover:bg-primary-50">
            <Truck className="w-4 h-4" /> View My Deliveries
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={Truck} label="Assigned" value={stats?.assignedDeliveries ?? 0} color="primary" />
        <DashboardCard icon={PackageCheck} label="Pending Pickup" value={stats?.pendingPickup ?? 0} color="amber" />
        <DashboardCard icon={MapPin} label="In Transit" value={stats?.inTransit ?? 0} color="blue" />
        <DashboardCard icon={CheckCircle2} label="Completed" value={stats?.completedDeliveries ?? 0} color="green" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Active Deliveries</h3>
          <Link to="/delivery/deliveries" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Truck}
              title="No active deliveries"
              message="New assignments will appear here automatically."
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {active.map((d) => (
              <div key={d._id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{d.order?.orderNumber || 'Order'}</p>
                    <p className="text-xs text-gray-500">{formatDate(d.createdAt)}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p className="flex items-start gap-1.5 text-gray-600">
                    <MapPin className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                    <span className="line-clamp-1">{d.pickupLocation || 'Farm pickup'}</span>
                  </p>
                  <p className="flex items-start gap-1.5 text-gray-600">
                    <MapPin className="w-4 h-4 text-earth-600 mt-0.5 shrink-0" />
                    <span className="line-clamp-1">{d.deliveryLocation || 'Buyer address'}</span>
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {d.order?.grandTotal ? formatCurrency(d.order.grandTotal) : ''}
                  </span>
                  <Link to="/delivery/deliveries" className="btn-secondary !py-1.5 !px-3 text-xs">
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
