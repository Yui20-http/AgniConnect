import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Truck,
  ShieldCheck,
  Users,
  Package,
  IndianRupee,
  Sprout,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { productService, userService } from '../services';
import ProductCard from '../components/ProductCard';
import ScrollMarketHero from '../components/ScrollMarketHero';
import LoadingSpinner from '../components/LoadingSpinner';
import { categoryIcons } from '../utils/helpers';

/**
 * Landing page - the public marketing homepage.
 */
const Landing = () => {
  const [featured, setFeatured] = useState([]);
  const [featuredFarmers, setFeaturedFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, farmersRes] = await Promise.all([
          productService.getAll({ limit: 8, sort: 'popular', available: 'true' }),
          userService.getFeaturedFarmers(),
        ]);
        setFeatured(productsRes.data.data);
        setFeaturedFarmers(farmersRes.data.data || []);
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
      <ScrollMarketHero search={search} setSearch={setSearch} onSearch={handleSearch} />

      <section className="harvest-ticker border-y border-lime-200/10 bg-[#0b1911] py-3" aria-label="Marketplace highlights">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 overflow-hidden px-5 sm:px-8 lg:px-12">
          <span className="relative z-10 flex shrink-0 items-center gap-2 rounded-full border border-lime-200/20 bg-lime-200/[.08] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.18em] text-lime-200"><span className="live-dot" /> Farm direct</span>
          <div className="ticker-window min-w-0 flex-1">
            <div className="ticker-track" aria-hidden="true">
              {[0, 1].map((copy) => <div key={copy} className="ticker-group">{['Seasonal harvests', 'Verified growers', 'Transparent prices', 'Fresh to your doorstep', 'Support local farms'].map((item) => <span key={`${copy}-${item}`} className="ticker-item"><span className="text-lime-300">✳</span>{item}</span>)}</div>)}
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATISTICS ============ */}
      <section data-reveal className="border-y border-[#e5e9e1] bg-white page-enter">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-y-6 px-5 py-8 sm:px-8 lg:grid-cols-4 lg:px-12 lg:py-9">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 border-[#e7ebe3] px-2 sm:px-6 lg:border-r last:border-r-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef4e9]"><stat.icon className="h-5 w-5 text-[#347546]" /></div>
              <div><p className="text-xl font-semibold tracking-tight text-[#1c2a1f] sm:text-2xl">{stat.value}</p><p className="mt-0.5 text-[11px] font-medium text-[#7b857a] sm:text-xs">{stat.label}</p></div>
            </div>
          ))}
        </div>
      </section>

      {featuredFarmers.length > 0 && <section data-reveal className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6"><h2 className="section-title">Featured Farmers</h2><p className="mt-2 text-gray-500">Verified farms selected by our team</p></div>
        <div className="stagger-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featuredFarmers.map((farmer) => <article data-reveal key={farmer._id} className="tilt-card card p-5">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-xl">🌱</div><div className="min-w-0"><h3 className="truncate font-bold text-gray-900">{farmer.farmName || farmer.name}</h3><p className="truncate text-xs text-gray-500">{farmer.farmLocation || farmer.location}</p></div></div>
          <div className="mt-4 flex items-center justify-between"><span className="inline-flex items-center gap-1 text-sm text-amber-600"><Star className="h-4 w-4 fill-current" />{Number(farmer.rating || 0).toFixed(1)}</span><Link className="text-sm font-semibold text-primary-700 hover:underline" to={`/marketplace?farmer=${farmer._id}`}>Shop produce</Link></div>
        </article>)}</div>
      </section>}

      {/* ============ FEATURED PRODUCTS ============ */}
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
          <div className="stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
      <section data-reveal id="how-it-works" className="bg-white py-16">
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
      <section data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
      <section data-reveal className="bg-gray-900 py-16">
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
      <section data-reveal id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#dbe6d4] bg-[#eaf1e4] p-8 text-center lg:p-12">
          <div className="pointer-events-none absolute -right-12 -top-28 h-72 w-72 rounded-full border border-[#d3e0cc]" />
          <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#5d795e]">Grow with us</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#173b28]">Good things grow closer.</h2>
          <p className="mx-auto mb-8 mt-4 max-w-2xl text-[#617264]">
            Whether you're a farmer looking for better prices, a buyer seeking fresh produce, or a
            delivery partner wanting to earn - AgriConnect is for you.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn rounded-xl bg-[#173b28] text-white shadow-sm hover:bg-[#204b32]">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/marketplace" className="btn border border-[#c7d7c0] bg-white/70 text-[#31533a] hover:bg-white">
              Explore Marketplace
            </Link>
          </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
