import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  BadgeCheck,
  CloudSun,
  ImagePlus,
  Lightbulb,
  Newspaper,
  Sprout,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/ToastContext';
import {
  analyticsService,
  marketPriceService,
  productService,
} from '../../services';
import { formatCurrency, getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../services/api';

// ─── helpers ────────────────────────────────────────────────────────────────

const normalize = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sameCrop = (crop, product) => {
  const m = normalize(crop);
  const p = normalize(product);
  return m === p || m.startsWith(p) || p.startsWith(m);
};

const TABS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'prices',    label: 'Price Advisor', icon: TrendingUp },
  { id: 'planning',  label: 'Planning', icon: Sprout },
  { id: 'advisor',   label: 'Crop Advisor', icon: Lightbulb },
  { id: 'schemes',   label: 'Schemes & Mandi', icon: Newspaper },
];

const GOVT_SCHEMES = [
  {
    title: 'PM-KISAN',
    emoji: '🌾',
    text: 'Income support of ₹6,000/year for eligible landholding farmer families.',
    url: 'https://pmkisan.gov.in/',
    color: 'bg-green-50 border-green-200',
    badge: 'Central scheme',
  },
  {
    title: 'PM Fasal Bima Yojana',
    emoji: '🛡️',
    text: 'Crop insurance against natural risks. Enrollment windows depend on crop season.',
    url: 'https://pmfby.gov.in/',
    color: 'bg-blue-50 border-blue-200',
    badge: 'Insurance',
  },
  {
    title: 'e-NAM',
    emoji: '📊',
    text: 'National electronic trading platform connecting farmers directly to markets.',
    url: 'https://www.enam.gov.in/',
    color: 'bg-indigo-50 border-indigo-200',
    badge: 'Market access',
  },
  {
    title: 'Soil Health Card',
    emoji: '🌱',
    text: 'Free soil testing and crop-specific nutrient recommendations.',
    url: 'https://soilhealth.dac.gov.in/',
    color: 'bg-amber-50 border-amber-200',
    badge: 'Input support',
  },
  {
    title: 'Kisan Credit Card',
    emoji: '💳',
    text: 'Short-term credit at subsidised interest for farming inputs and expenses.',
    url: 'https://www.nabard.org/content.aspx?id=572',
    color: 'bg-purple-50 border-purple-200',
    badge: 'Credit',
  },
  {
    title: 'AGMARKNET',
    emoji: '🏪',
    text: 'Live mandi arrival data and commodity prices from APMC markets across India.',
    url: 'https://agmarknet.gov.in/',
    color: 'bg-rose-50 border-rose-200',
    badge: 'Mandi data',
  },
];

const PIE_COLORS = ['#16a34a', '#65a30d', '#ca8a04', '#0284c7', '#7c3aed', '#dc2626', '#0891b2', '#b45309'];

// ─── sub-components ─────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-60">{sub}</p>}
    </div>
  );
};

// ─── tab panels ─────────────────────────────────────────────────────────────

const AnalyticsTab = ({ analytics }) => {
  if (!analytics) return <LoadingSpinner label="Loading analytics…" />;
  const { revenueByMonth, topProducts, repeatBuyers, ordersByStatus, totals } = analytics;
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross revenue" value={formatCurrency(totals.grossRevenue)} sub="Delivered orders" color="primary" />
        <StatCard label="Net earnings" value={formatCurrency(totals.netRevenue)} sub="After 6% commission" color="blue" />
        <StatCard label="Delivered orders" value={totals.deliveredOrders} sub="All time" color="primary" />
        <StatCard label="Repeat buyers" value={totals.repeatBuyerCount} sub={`of ${totals.uniqueBuyers} unique`} color="amber" />
      </div>

      {/* Revenue line + bar */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-600" /> Revenue trend – last 12 months
          </h3>
          <p className="text-xs text-gray-500 mb-4">Gross vs net farmer payout per month.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="grossRevenue" name="Gross" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="netRevenue" name="Net" stroke="#65a30d" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary-600" /> Orders by month
          </h3>
          <p className="text-xs text-gray-500 mb-4">Number of completed orders each month.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" name="Orders" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top products + status breakdown */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-primary-600" /> Top products by revenue
          </h3>
          {topProducts.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" name="Revenue" fill="#65a30d" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Revenue data will appear after orders are delivered.</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Order status mix</h3>
          {Object.keys(ordersByStatus).length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(ordersByStatus).map(([name, value]) => ({ name, value }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name"
                  >
                    {Object.keys(ordersByStatus).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No order data yet.</p>
          )}
        </div>
      </div>

      {/* Repeat buyers */}
      {repeatBuyers.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" /> Repeat buyers ({repeatBuyers.length})
          </h3>
          <div className="divide-y">
            {repeatBuyers.map((b) => (
              <div key={b.buyerId} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                    {(b.name || 'B')[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800">{b.name}</span>
                </div>
                <span className="badge bg-blue-100 text-blue-700">{b.count} orders</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PricesTab = ({ products, prices, user, onPriceApplied }) => {
  const { toast } = useToast();
  const [applying, setApplying] = useState(null); // productId being applied

  const farmPlace = normalize(user?.farmLocation || user?.location || '');

  const suggestions = useMemo(() => products.flatMap((product) => {
    const candidates = prices.filter((p) =>
      sameCrop(p.crop, product.name) && normalize(p.unit) === normalize(product.unit)
    );
    if (!candidates.length) return [];
    const local = candidates.filter((p) => farmPlace && farmPlace.includes(normalize(p.location).replace(/apmc/g, '')));
    const chosen = (local.length ? local : candidates).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
    const marketPrice = Number(chosen.currentPrice);
    const diff = marketPrice - Number(product.pricePerUnit);
    return [{ ...product, marketPrice, marketLocation: chosen.location, marketUpdatedAt: chosen.updatedAt, difference: diff, isDemo: chosen.isDemo !== false }];
  }), [products, prices, farmPlace]);

  const applyPrice = async (product, pct) => {
    const suggested = Number((product.marketPrice * (pct / 100)).toFixed(2));
    try {
      setApplying(`${product._id}-${pct}`);
      await productService.applyMarketPrice(product._id, suggested);
      toast.success(`Price for ${product.name} set to ${formatCurrency(suggested)} (${pct}% of market)`);
      onPriceApplied();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>How it works:</strong> We match your products with the closest crop, unit, and location from the market price table and show the current reference price. Use the buttons to set your price at 80%, 90%, or 100% of the market rate. Always verify locally before changing your listing.
        {suggestions.some((s) => s.isDemo) && <span className="ml-1 text-blue-700"> · Market data shown is demo/simulated.</span>}
      </div>

      {suggestions.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 text-sm">No matching market prices found for your current products. Ensure product names and units align with the market price table.</p>
          <Link to="/market-prices" className="mt-3 inline-block text-sm text-primary-700 underline">View market price table →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((product) => (
            <div key={product._id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    Your price: <span className="font-semibold text-gray-800">{formatCurrency(product.pricePerUnit)}/{product.unit}</span>
                    <span className="mx-2">·</span>
                    Market ref: <span className="font-semibold">{formatCurrency(product.marketPrice)}/{product.unit}</span>
                    {product.marketLocation && <span className="ml-1 text-gray-400">@ {product.marketLocation}</span>}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${product.difference >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {product.difference >= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  {product.difference >= 0
                    ? `${formatCurrency(product.difference)} below market`
                    : `${formatCurrency(Math.abs(product.difference))} above market`}
                </span>
              </div>

              {/* Price suggestion buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[80, 90, 100].map((pct) => {
                  const suggested = Number((product.marketPrice * (pct / 100)).toFixed(2));
                  const key = `${product._id}-${pct}`;
                  return (
                    <button
                      key={pct}
                      onClick={() => applyPrice(product, pct)}
                      disabled={applying === key}
                      className="btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      {applying === key ? 'Applying…' : `Set at ${pct}% · ${formatCurrency(suggested)}`}
                    </button>
                  );
                })}
              </div>

              {/* Sparkline of market history if available */}
            </div>
          ))}
        </div>
      )}

      <div className="text-center">
        <Link to="/market-prices" className="text-sm text-primary-700 underline">
          View full market price table →
        </Link>
      </div>
    </div>
  );
};

const PlanningTab = ({ products }) => {
  const upcomingHarvests = useMemo(() =>
    products.filter((p) => p.harvestDate && new Date(p.harvestDate) >= new Date(new Date().toDateString()))
      .sort((a, b) => new Date(a.harvestDate) - new Date(b.harvestDate)),
  [products]);

  const lowStock = useMemo(() =>
    products.filter((p) => p.isAvailable && Number(p.quantity) > 0 && Number(p.quantity) <= 10)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity)),
  [products]);

  const outOfStock = useMemo(() =>
    products.filter((p) => !p.isAvailable || Number(p.quantity) === 0),
  [products]);

  return (
    <div className="space-y-5">
      {/* Low-stock alerts */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Low-stock alerts
        </h3>
        <p className="text-xs text-gray-500 mb-4">Available products with 10 or fewer units.</p>
        {lowStock.length ? (
          <div className="space-y-2">
            {lowStock.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category} · {p.location || 'Location not set'}</p>
                </div>
                <span className="badge bg-amber-200 text-amber-800 shrink-0 text-xs">
                  {p.quantity} {p.unit} left
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">✅ All listings have healthy stock levels.</p>
        )}
      </div>

      {/* Out of stock */}
      {outOfStock.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <X className="h-4 w-4 text-red-500" /> Out of stock / unavailable
          </h3>
          <div className="space-y-2">
            {outOfStock.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <span className="badge bg-red-100 text-red-700 text-xs">Unavailable</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Harvest schedule */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
          <Sprout className="h-4 w-4 text-primary-600" /> Harvest schedule & pre-orders
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Set a future harvest date on a product and enable pre-orders so buyers can reserve stock before harvest.
        </p>
        {upcomingHarvests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Product</th>
                  <th className="px-4 py-2 font-semibold">Harvest date</th>
                  <th className="px-4 py-2 font-semibold">Qty</th>
                  <th className="px-4 py-2 font-semibold">Pre-orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingHarvests.map((p) => {
                  const days = Math.ceil((new Date(p.harvestDate) - new Date()) / 86400000);
                  return (
                    <tr key={p._id}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {new Date(p.harvestDate).toLocaleDateString('en-IN')}
                        <span className="ml-2 text-xs text-gray-400">({days}d away)</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{p.quantity} {p.unit}</td>
                      <td className="px-4 py-2.5">
                        {p.isPreOrder
                          ? <span className="badge bg-amber-100 text-amber-800 text-xs">Enabled</span>
                          : <span className="badge bg-gray-100 text-gray-500 text-xs">Off</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">No upcoming harvest dates. Add a harvest date in My Products to appear here.</p>
        )}
        <Link to="/farmer/products" className="btn-secondary mt-4 !py-2 text-xs">
          Manage products & harvest dates →
        </Link>
      </div>
    </div>
  );
};

const AdvisorTab = ({ user }) => {
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const fileRef = useRef(null);

  const [weather, setWeather] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    const place = user?.farmLocation || user?.location;
    if (!place) {
      setWeatherError('Add your farm location to your profile to get a local forecast.');
      setWeatherLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const query = encodeURIComponent(place.split(',')[0].trim());
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`);
        const geo = await geoRes.json();
        const pt = geo.results?.[0];
        if (!pt) throw new Error(`Could not find forecast location for "${place}".`);
        const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pt.latitude}&longitude=${pt.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&forecast_days=7&timezone=auto`);
        const f = await fRes.json();
        const rows = (f.daily?.time || []).map((day, i) => ({
          day,
          high: f.daily.temperature_2m_max[i],
          low: f.daily.temperature_2m_min[i],
          rain: f.daily.precipitation_probability_max[i],
          code: f.daily.weathercode?.[i],
        }));
        if (active) setWeather(rows);
      } catch (err) {
        if (active) setWeatherError(err.message || 'Forecast unavailable.');
      } finally {
        if (active) setWeatherLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.farmLocation, user?.location]);

  const weatherIcon = (code) => {
    if (code === undefined || code === null) return '🌤️';
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    return '⛈️';
  };

  const handlePhoto = (file) => {
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim() && !photo) {
      toast.warning('Describe the issue or attach a leaf photo first.');
      return;
    }
    setAsking(true);
    setAnswer('');
    try {
      const body = new FormData();
      body.append('question', question.trim());
      if (photo) body.append('image', photo);
      const { data } = await api.post('/advice/crop', body);
      setAnswer(data.answer || 'No advice returned.');
    } catch (err) {
      setAnswer(getErrorMessage(err));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Weather */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
          <CloudSun className="h-4 w-4 text-sky-500" />
          7-day weather · {user?.farmLocation || user?.location || 'Set farm location in profile'}
        </h3>
        {weatherLoading ? (
          <p className="text-sm text-gray-500">Loading forecast…</p>
        ) : weather.length ? (
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {weather.map((day) => (
              <div key={day.day} className="rounded-xl bg-sky-50 p-3 text-center text-sm">
                <p className="font-semibold text-gray-700 text-xs">
                  {new Date(day.day + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
                </p>
                <p className="text-2xl my-1">{weatherIcon(day.code)}</p>
                <p className="text-xs font-medium text-gray-800">{Math.round(day.high)}° / {Math.round(day.low)}°</p>
                <p className="text-xs text-sky-700 mt-0.5">💧 {day.rain ?? '—'}%</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{weatherError || 'Forecast unavailable.'}</p>
        )}
      </div>

      {/* AI Crop assistant */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Crop health assistant
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Describe symptoms or attach a leaf photo. Powered by AI — always confirm diagnosis with your local KVK officer. Requires <code>OPENAI_API_KEY</code> on the backend.
        </p>
        <form onSubmit={ask} className="space-y-3">
          <textarea
            className="input"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Yellow spots on tomato leaves, wilting in the afternoon…"
          />

          {/* Photo picker */}
          <div
            className="flex items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-3 hover:border-primary-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-500">{photo ? photo.name : 'Click to attach a leaf / crop photo (optional)'}</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handlePhoto(e.target.files?.[0] || null)} />
          </div>

          {photoPreview && (
            <div className="relative inline-block">
              <img src={photoPreview} alt="Attached" className="h-32 w-32 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => handlePhoto(null)}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <button disabled={asking} className="btn-primary">
            {asking ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" /> Analysing…</span>
            ) : 'Ask crop assistant'}
          </button>
        </form>

        {answer && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="h-4 w-4 text-green-600" />
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">AI Response</p>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SchemesTab = ({ prices }) => (
  <div className="space-y-5">
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {GOVT_SCHEMES.map((scheme) => (
        <a
          key={scheme.title}
          href={scheme.url}
          target="_blank"
          rel="noreferrer"
          className={`rounded-2xl border p-4 hover:shadow-md transition-shadow ${scheme.color}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-3xl">{scheme.emoji}</span>
            <span className="badge bg-white/70 text-gray-600 text-[10px] shrink-0">{scheme.badge}</span>
          </div>
          <p className="mt-3 font-bold text-gray-900 text-sm">{scheme.title}</p>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">{scheme.text}</p>
          <p className="mt-3 text-xs font-semibold text-primary-700">Visit official portal →</p>
        </a>
      ))}
    </div>

    {/* Mandi price overview */}
    {prices.length > 0 && (
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> Mandi price snapshot
          <span className="badge bg-amber-100 text-amber-700 text-[10px]">Demo data</span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">Simulated reference prices seeded in the system. Use AGMARKNET for live rates.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Crop</th>
                <th className="px-4 py-2 font-semibold">Location</th>
                <th className="px-4 py-2 font-semibold text-right">Price</th>
                <th className="px-4 py-2 font-semibold text-right">Prev.</th>
                <th className="px-4 py-2 font-semibold text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prices.slice(0, 20).map((p) => {
                const change = p.previousPrice ? (((p.currentPrice - p.previousPrice) / p.previousPrice) * 100).toFixed(1) : null;
                return (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{p.crop}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.location || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(p.currentPrice)}/{p.unit}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{p.previousPrice ? formatCurrency(p.previousPrice) : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {change !== null ? (
                        <span className={`text-xs font-semibold ${Number(change) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {Number(change) >= 0 ? '▲' : '▼'} {Math.abs(change)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <a href="https://agmarknet.gov.in/" target="_blank" rel="noreferrer" className="text-primary-700 underline">AGMARKNET live prices</a>
          <a href="https://pib.gov.in/" target="_blank" rel="noreferrer" className="text-primary-700 underline">PIB agriculture news</a>
          <a href="https://www.enam.gov.in/" target="_blank" rel="noreferrer" className="text-primary-700 underline">e-NAM platform</a>
        </div>
      </div>
    )}
  </div>
);

// ─── main page ───────────────────────────────────────────────────────────────

const FarmerInsights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [anaRes, prodRes, priceRes] = await Promise.all([
        analyticsService.farmerDashboard(),
        productService.getMyProducts(),
        marketPriceService.getAll(),
      ]);
      setAnalytics(anaRes.data.data);
      setProducts(prodRes.data.data || []);
      setPrices(priceRes.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Could not load farm insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  if (loading) return <LoadingSpinner fullScreen label="Loading farm insights…" />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Farm Insights</h2>
        <p className="mt-1 text-sm text-gray-500">Analytics, price advisor, planning, crop AI, and government resources.</p>
      </header>

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 rounded-xl bg-gray-100 p-1 no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div>
        {tab === 'analytics' && <AnalyticsTab analytics={analytics} />}
        {tab === 'prices'    && <PricesTab products={products} prices={prices} user={user} onPriceApplied={load} />}
        {tab === 'planning'  && <PlanningTab products={products} />}
        {tab === 'advisor'   && <AdvisorTab user={user} />}
        {tab === 'schemes'   && <SchemesTab prices={prices} />}
      </div>
    </div>
  );
};

export default FarmerInsights;
