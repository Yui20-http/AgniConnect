import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Truck,
  ShieldCheck,
  TrendingUp,
  Users,
  Package,
  IndianRupee,
  Sprout,
  CheckCircle2,
  Star,
  MapPin,
} from 'lucide-react';
import { productService } from '../services';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, categoryIcons } from '../utils/helpers';

/**
 * Landing page - the public marketing homepage.
 */
const Landing = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await productService.getAll({ limit: 8, sort: 'popular', available: 'true' });
        setFeatured(data.data);
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/marketplace?search=${encodeURIComponent(search)}`);
  };

  const stats = [
    { icon: Users, value: '5,000+', label: 'Registered Farmers' },
    { icon: Package, value: '25,000+', label: 'Products Listed' },
    { icon: Truck, value: '1,200+', label: 'Delivery Partners' },
    { icon: IndianRupee, value: '₹2.5 Cr+', label: 'Farmer Earnings' },
  ];

  const categories = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Dairy'];

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-earth-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-earth-200 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 badge bg-primary-100 text-primary-700 mb-5">
                <Sprout className="w-4 h-4" /> Farm to Table, Directly
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                Fresh from the <span className="text-primary-600">Farm</span>, Delivered to Your Door
              </h1>
              <p className="mt-5 text-lg text-gray-600 leading-relaxed">
                AgriConnect connects farmers directly with buyers, eliminating middlemen and ensuring
                fair prices. Real-time orders, transparent logistics, and fresh produce every time.
              </p>

              <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for tomatoes, rice, mangoes..."
                    className="input pl-11 h-12"
                  />
                </div>
                <button type="submit" className="btn-primary h-12 px-6">
                  Search <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link
                    key={c}
                    to={`/marketplace?category=${c}`}
                    className="badge bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition"
                  >
                    {categoryIcons[c]} {c}
                  </Link>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> No middlemen
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Real-time tracking
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" /> Fair prices
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80"
                  alt="Fresh vegetables"
                  className="rounded-2xl shadow-lg h-56 w-full object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80"
                  alt="Farmer in field"
                  className="rounded-2xl shadow-lg h-56 w-full object-cover mt-8"
                />
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80"
                  alt="Market produce"
                  className="rounded-2xl shadow-lg h-56 w-full object-cover -mt-4"
                />
                <img
                  src="https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&q=80"
                  alt="Agriculture field"
                  className="rounded-2xl shadow-lg h-56 w-full object-cover mt-4"
                />
              </div>
              <div className="absolute -bottom-4 left-4 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg. farmer income</p>
                  <p className="font-bold text-gray-900">+38% increase</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATISTICS ============ */}
      <section className="bg-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="w-7 h-7 text-primary-200 mx-auto mb-2" />
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{s.value}</p>
                <p className="text-sm text-primary-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED PRODUCTS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title">Featured Products</h2>
            <p className="text-gray-500 mt-2">Fresh picks directly from our farmers</p>
          </div>
          <Link to="/marketplace" className="hidden sm:flex items-center gap-1 link">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading featured products..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link to="/marketplace" className="btn-primary">
            View All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">How AgriConnect Works</h2>
            <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
              A simple, transparent process connecting farmers, buyers and delivery partners.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Sprout, title: 'Farmers List', desc: 'Farmers add their fresh produce with price, quantity and location.' },
              { icon: Search, title: 'Buyers Browse', desc: 'Buyers search, compare prices and add products to their cart.' },
              { icon: Package, title: 'Order Placed', desc: 'Orders are placed and farmers get instant real-time notifications.' },
              { icon: Truck, title: 'Fast Delivery', desc: 'Delivery partners pick up and deliver with live status tracking.' },
            ].map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-primary-600" />
                </div>
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-7 h-7 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BENEFITS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Farmer benefits */}
          <div className="card p-8 bg-gradient-to-br from-primary-50 to-white">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center mb-4">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">For Farmers</h3>
            <ul className="space-y-3">
              {[
                'Sell directly to buyers - no middlemen',
                'Get better prices for your produce',
                'Reach buyers across Maharashtra & India',
                'Manage orders and inventory easily',
                'Real-time notifications for new orders',
                'Track your sales and earnings',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link to="/register" className="btn-primary mt-6">
              Register as Farmer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Buyer benefits */}
          <div className="card p-8 bg-gradient-to-br from-earth-50 to-white">
            <div className="w-12 h-12 rounded-xl bg-earth-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">For Buyers</h3>
            <ul className="space-y-3">
              {[
                'Buy fresh produce directly from farms',
                'Compare prices across multiple farmers',
                'Transparent pricing - no hidden costs',
                'Track your orders in real time',
                'Wide variety of categories',
                'Reliable delivery to your doorstep',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-earth-600 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link to="/register" className="btn bg-earth-600 text-white hover:bg-earth-700 mt-6">
              Register as Buyer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ LOGISTICS ============ */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="badge bg-primary-600/20 text-primary-300 mb-4">
                <Truck className="w-4 h-4" /> Agricultural Logistics
              </span>
              <h2 className="text-3xl font-bold text-white mb-4">
                Reliable Logistics, Every Step of the Way
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Our delivery partner network ensures your produce reaches buyers fresh and on time.
                Track every stage from pickup to delivery with live status updates.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Package, title: 'Ready for Pickup', desc: 'Farmer prepares the order' },
                  { icon: Truck, title: 'Picked Up & In Transit', desc: 'Delivery partner collects and moves it' },
                  { icon: ShieldCheck, title: 'Delivered Safely', desc: 'Buyer receives fresh produce' },
                ].map((s) => (
                  <div key={s.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0">
                      <s.icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{s.title}</p>
                      <p className="text-sm text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80"
                alt="Logistics truck"
                className="rounded-2xl shadow-2xl w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ ABOUT / CTA ============ */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card p-8 lg:p-12 bg-gradient-to-br from-primary-600 to-primary-700 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Join AgriConnect?</h2>
          <p className="text-primary-100 max-w-2xl mx-auto mb-8">
            Whether you're a farmer looking for better prices, a buyer seeking fresh produce, or a
            delivery partner wanting to earn - AgriConnect is for you.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn bg-white text-primary-700 hover:bg-primary-50">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/marketplace" className="btn border border-white/40 text-white hover:bg-white/10">
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
