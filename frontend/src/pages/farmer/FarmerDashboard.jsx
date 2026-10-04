import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Clock,
  IndianRupee,
  ShoppingBag,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { orderService, productService, paymentService } from '../../services';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/ToastContext';
import DashboardCard from '../../components/DashboardCard';
import OrderCard from '../../components/OrderCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/helpers';

/**
 * FarmerDashboard - overview of a farmer's products, orders and sales.
 */
const FarmerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, ordersRes, productsRes, payoutRes] = await Promise.all([
          orderService.farmerStats(),
          orderService.getAll({ limit: 5 }),
          productService.getMyProducts(),
          paymentService.getPayouts(),
        ]);
        setStats(statsRes.data.data);
        setRecentOrders(ordersRes.data.data);
        setPayoutSummary(payoutRes.data.data);
        setLowStock(
          productsRes.data.data.filter((p) => p.quantity <= 10 && p.isAvailable).slice(0, 5)
        );
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
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-[#dce7d5] bg-[#eaf1e4] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-20 h-64 w-64 rounded-full border border-[#d3e0cc]" />
        <div className="pointer-events-none absolute -right-1 -top-12 h-48 w-48 rounded-full border border-[#d3e0cc]" />
        <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#5d795e]">Farmer workspace</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#173b28] sm:text-3xl">Welcome back, {user?.name?.split(' ')[0]}.</h2>
        <p className="mt-1 text-sm text-[#617264]">
          {user?.farmName ? `${user.farmName} · ` : ''}
          {user?.farmLocation || 'Manage your farm listings and orders here.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/farmer/products" className="btn rounded-xl bg-[#173b28] text-white shadow-sm hover:bg-[#204b32]">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
          <Link to="/farmer/orders" className="btn border border-[#cadbc3] bg-white/65 text-[#31533a] hover:bg-white">
            <ShoppingBag className="w-4 h-4" /> View Orders
          </Link>
          <Link to="/farmer/earnings" className="btn border border-[#cadbc3] bg-white/65 text-[#31533a] hover:bg-white">
            <IndianRupee className="w-4 h-4" /> Earnings
          </Link>
        </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard icon={Package} label="Total Products" value={stats?.totalProducts ?? 0} color="primary" />
        <DashboardCard icon={CheckCircle2} label="Active Listings" value={stats?.activeListings ?? 0} color="green" />
        <DashboardCard icon={Clock} label="Pending Orders" value={stats?.pendingOrders ?? 0} color="amber" />
        <DashboardCard icon={ShoppingBag} label="Completed Orders" value={stats?.completedOrders ?? 0} color="blue" />
        <DashboardCard
          icon={IndianRupee}
          label="Total Sales"
          value={formatCurrency(stats?.totalSales ?? 0)}
          color="purple"
        />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Payout Summary</p>
            <h3 className="text-lg font-bold text-gray-900">Net earnings</h3>
          </div>
          <span className="badge bg-purple-100 text-purple-700">{payoutSummary?.commissionRate ?? 6}% platform fee</span>
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-gray-500">Gross sales</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(payoutSummary?.totals?.grossProduceSales ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-gray-500">Platform commission</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(payoutSummary?.totals?.platformCommission ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-primary-50 p-3">
            <p className="text-gray-500">Farmer payout</p>
            <p className="text-lg font-bold text-primary-700">{formatCurrency(payoutSummary?.totals?.earned ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
            <Link to="/farmer/orders" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                message="When buyers order your products, they'll appear here."
              />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {recentOrders.map((o) => (
                <OrderCard key={o._id} order={o} role="farmer" />
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" /> Low Stock Alerts
          </h3>
          <div className="card p-4">
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                All your products have healthy stock levels. 🌾
              </p>
            ) : (
              <ul className="space-y-3">
                {lowStock.map((p) => (
                  <li key={p._id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </div>
                    <span className="badge bg-amber-100 text-amber-700 shrink-0">
                      {p.quantity} {p.unit} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
