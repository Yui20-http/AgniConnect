import { useEffect, useState } from 'react';
import {
  Users,
  Package,
  ShoppingBag,
  IndianRupee,
  Truck,
  Sprout,
  Store,
  Bike,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { adminService } from '../../services';
import { useToast } from '../../context/ToastContext';
import DashboardCard from '../../components/DashboardCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/helpers';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#9333ea', '#dc2626', '#0891b2', '#65a30d', '#db2777'];

/**
 * AdminDashboard - platform-wide statistics and charts.
 */
const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, chartsRes] = await Promise.all([
          adminService.stats(),
          adminService.charts(),
        ]);
        setStats(statsRes.data.data);
        setCharts(chartsRes.data.data);
      } catch (err) {
        toast.error('Could not load admin data');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSpinner fullScreen label="Loading admin dashboard..." />;

  const tooltipStyle = { borderRadius: 8, border: '1px solid #eee', fontSize: 12 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-sm text-gray-500">Real-time statistics across the AgriConnect marketplace.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} color="primary" />
        <DashboardCard icon={Package} label="Total Products" value={stats?.totalProducts ?? 0} color="blue" />
        <DashboardCard icon={ShoppingBag} label="Total Orders" value={stats?.totalOrders ?? 0} color="amber" />
        <DashboardCard
          icon={IndianRupee}
          label="Total Sales"
          value={formatCurrency(stats?.totalSales ?? 0)}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={Sprout} label="Farmers" value={stats?.totalFarmers ?? 0} color="green" />
        <DashboardCard icon={Store} label="Buyers" value={stats?.totalBuyers ?? 0} color="indigo" />
        <DashboardCard icon={Bike} label="Delivery Partners" value={stats?.totalDelivery ?? 0} color="blue" />
        <DashboardCard icon={Truck} label="Completed Deliveries" value={stats?.completedDeliveries ?? 0} color="primary" />
      </div>

      {/* Orders + sales over time */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Orders Over Time (14 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts?.ordersOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="orders" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Sales Over Time (14 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts?.ordersOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distributions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Products by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts?.productsByCategory || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">User Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={charts?.userDistribution || []}
                dataKey="count"
                nameKey="role"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(e) => `${e.role}: ${e.count}`}
                labelLine={false}
              >
                {(charts?.userDistribution || []).map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={charts?.orderStatusDistribution || []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {(charts?.orderStatusDistribution || []).map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
