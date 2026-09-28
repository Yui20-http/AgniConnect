import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  IndianRupee,
  ShoppingCart,
  ArrowRight,
  Store,
} from 'lucide-react';
import { orderService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import DashboardCard from '../../components/DashboardCard';
import OrderCard from '../../components/OrderCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/helpers';

/**
 * BuyerDashboard - overview of a buyer's orders and spending.
 */
const BuyerDashboard = () => {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, ordersRes] = await Promise.all([
          orderService.buyerStats(),
          orderService.getAll({ limit: 4 }),
        ]);
        setStats(statsRes.data.data);
        setRecentOrders(ordersRes.data.data);
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

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-500 text-white border-0">
        <h2 className="text-2xl font-extrabold">Hello, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-primary-50 mt-1">
          Discover fresh produce directly from farmers across Maharashtra.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/marketplace" className="btn bg-white text-primary-700 hover:bg-primary-50">
            <Store className="w-4 h-4" /> Browse Marketplace
          </Link>
          <Link to="/buyer/cart" className="btn bg-white/15 text-white hover:bg-white/25">
            <ShoppingCart className="w-4 h-4" /> My Cart ({itemCount})
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={ShoppingBag} label="Total Orders" value={stats?.totalOrders ?? 0} color="primary" />
        <DashboardCard icon={Clock} label="Active Orders" value={stats?.activeOrders ?? 0} color="amber" />
        <DashboardCard icon={CheckCircle2} label="Completed" value={stats?.completedOrders ?? 0} color="green" />
        <DashboardCard
          icon={IndianRupee}
          label="Total Spent"
          value={formatCurrency(stats?.totalSpent ?? 0)}
          color="purple"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
          <Link to="/buyer/orders" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              message="Browse the marketplace and place your first order."
              action={
                <Link to="/marketplace" className="btn-primary">
                  <Store className="w-4 h-4" /> Go to Marketplace
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {recentOrders.map((o) => (
              <OrderCard key={o._id} order={o} role="buyer" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
