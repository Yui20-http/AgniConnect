import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Info,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { marketPriceService } from '../services';
import { formatCurrency, formatDateTime, categoryIcons } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Dairy', 'Other'];

/**
 * MarketPrices - public page showing demo mandi/market prices with a trend chart.
 * NOTE: These are DEMO values for the college project, not live government data.
 */
const MarketPrices = () => {
  const { toast } = useToast();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await marketPriceService.getAll();
      setPrices(data.data);
      if (data.data.length) setSelected(data.data[0]);
    } catch (err) {
      toast.error('Could not load market prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = prices.filter((p) => {
    const matchCat = category === 'All' || p.category === category;
    const matchSearch = p.crop.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const changeIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const changeClass = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const chartData =
    selected?.history?.map((h) => ({
      date: new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      price: h.price,
    })) || [];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-white/15">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold">Market Prices</h1>
          </div>
          <p className="text-primary-50 max-w-2xl">
            Track indicative crop prices across major Maharashtra markets to plan your selling
            strategy. Compare trends and find the best time to sell.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 rounded-lg px-3 py-1.5 text-sm text-amber-50">
            <Info className="w-4 h-4" />
            Demo data for academic use — not live government mandi rates.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  category === c
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crop..."
              className="input !py-2 sm:w-48"
            />
            <button onClick={load} className="btn-secondary !py-2" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner fullScreen label="Loading market prices..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No market prices found"
            message="Try a different category or search term."
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Table */}
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Crop</th>
                      <th className="px-4 py-3 font-semibold">Market</th>
                      <th className="px-4 py-3 font-semibold text-right">Current</th>
                      <th className="px-4 py-3 font-semibold text-right">Previous</th>
                      <th className="px-4 py-3 font-semibold text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((p) => (
                      <tr
                        key={p._id}
                        onClick={() => setSelected(p)}
                        className={`cursor-pointer hover:bg-primary-50/50 transition ${
                          selected?._id === p._id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{categoryIcons[p.category] || '🌱'}</span>
                            <div>
                              <p className="font-semibold text-gray-900">{p.crop}</p>
                              <p className="text-xs text-gray-400">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {p.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {formatCurrency(p.currentPrice)}
                          <span className="block text-xs font-normal text-gray-400">
                            /{p.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {formatCurrency(p.previousPrice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 font-semibold ${changeClass(p.changePercent)}`}>
                            {changeIcon(p.changePercent)}
                            {p.changePercent > 0 ? '+' : ''}
                            {p.changePercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail + chart */}
            <div className="space-y-6">
              {selected && (
                <>
                  <div className="card p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{categoryIcons[selected.category] || '🌱'}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{selected.crop}</h3>
                        <p className="text-xs text-gray-500">{selected.location} Market</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Current Price</p>
                        <p className="text-xl font-bold text-primary-700">
                          {formatCurrency(selected.currentPrice)}
                        </p>
                        <p className="text-xs text-gray-400">per {selected.unit}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Change</p>
                        <p className={`text-xl font-bold ${changeClass(selected.changePercent)}`}>
                          {selected.changePercent > 0 ? '+' : ''}
                          {selected.changePercent}%
                        </p>
                        <p className="text-xs text-gray-400">vs previous</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                      Updated {formatDateTime(selected.updatedAt)}
                    </p>
                  </div>

                  <div className="card p-5">
                    <h3 className="font-bold text-gray-900 mb-3">Price Trend</h3>
                    {chartData.length > 1 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} width={45} />
                          <Tooltip
                            formatter={(v) => [formatCurrency(v), 'Price']}
                            contentStyle={{ borderRadius: 8, border: '1px solid #eee', fontSize: 12 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#16a34a"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-gray-400 py-8 text-center">
                        Not enough history to draw a trend yet.
                      </p>
                    )}
                  </div>
                </>
              )}

              <Link
                to="/compare"
                className="card p-5 flex items-center justify-between hover:shadow-card-hover transition group"
              >
                <div>
                  <h3 className="font-bold text-gray-900">Compare Farmer Prices</h3>
                  <p className="text-sm text-gray-500">
                    See who sells a crop for the least.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPrices;
