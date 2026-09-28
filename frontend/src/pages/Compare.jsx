import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, MapPin, Star, ShoppingCart, TrendingDown, ArrowRight } from 'lucide-react';
import { productService } from '../services';
import { formatCurrency, categoryIcons } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

/**
 * Compare - compare the same product across different farmers, sorted by price.
 */
const Compare = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [names, setNames] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadNames = async () => {
      try {
        const { data } = await productService.names();
        setNames(data.data);
        if (data.data.length) {
          setSelectedName(data.data[0]);
        }
      } catch (err) {
        toast.error('Could not load product list');
      }
    };
    loadNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedName) return;
    const run = async () => {
      try {
        setLoading(true);
        const { data } = await productService.compare(selectedName);
        setResults(data.data);
      } catch (err) {
        toast.error('Could not compare prices');
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedName]);

  const handleAdd = async (product) => {
    if (!user || user.role !== 'buyer') {
      toast.warning('Please login as a buyer to add items to cart');
      return;
    }
    try {
      await addToCart(product._id, product.minOrderQuantity || 1);
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not add to cart');
    }
  };

  const cheapestId = results.length ? results[0]._id : null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-earth-700 to-earth-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-white/15">
              <GitCompare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold">Price Comparison</h1>
          </div>
          <p className="text-earth-50 max-w-2xl">
            Compare the same crop across multiple farmers and pick the best price. Results are
            sorted from lowest to highest.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-5 mb-6">
          <label className="label">Choose a product to compare</label>
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="input max-w-md"
          >
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingSpinner fullScreen label="Comparing prices..." />
        ) : results.length === 0 ? (
          <EmptyState
            icon={GitCompare}
            title="No products to compare"
            message="Pick a product above, or check back once farmers list more items."
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((p, idx) => (
              <div
                key={p._id}
                className={`card overflow-hidden flex flex-col ${
                  idx === 0 ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                {idx === 0 && (
                  <div className="bg-primary-600 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5" /> Best Price
                  </div>
                )}
                <div className="h-40 bg-gradient-to-br from-primary-50 to-earth-50 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">{categoryIcons[p.category] || '🌱'}</span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {p.location}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                    <span className="font-medium">{p.farmer?.name || 'Farmer'}</span>
                    {p.farmer?.rating && (
                      <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                        <Star className="w-3 h-3 fill-amber-500" /> {p.farmer.rating}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary-700">
                        {formatCurrency(p.pricePerUnit)}
                      </p>
                      <p className="text-xs text-gray-400">per {p.unit}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {p.quantity} {p.unit} available
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link to={`/product/${p._id}`} className="btn-secondary flex-1 !py-2 text-xs">
                      Details
                    </Link>
                    <button
                      onClick={() => handleAdd(p)}
                      disabled={!p.isAvailable || p.quantity <= 0}
                      className="btn-primary flex-1 !py-2 text-xs"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/marketplace" className="btn-secondary">
            Browse full marketplace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Compare;
