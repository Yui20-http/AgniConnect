import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Calendar,
  Package,
  Tag,
  ArrowLeft,
  User,
  Phone,
  CheckCircle2,
  Heart,
} from 'lucide-react';
import { productService, userService } from '../services';
import LoadingSpinner from '../components/LoadingSpinner';
import ReviewSection from '../components/ReviewSection';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, categoryIcons, getErrorMessage } from '../utils/helpers';

/**
 * ProductDetails - full product page with quantity selector and add-to-cart.
 */
const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await productService.getById(id);
        setProduct(data.data);
        setQuantity(data.data.minOrderQuantity || 1);
      } catch (err) {
        toast.error('Product not found');
        navigate('/marketplace');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate, toast]);

  useEffect(() => {
    const farmerId = product?.farmer?._id || product?.farmer;
    if (!farmerId || user?.role !== 'buyer') {
      setFavorited(false);
      return;
    }
    userService.getFavorites()
      .then(({ data }) => setFavorited((data.data || []).some((farmer) => String(farmer._id) === String(farmerId))))
      .catch(() => setFavorited(false));
  }, [product, user?.role]);

  if (loading) return <LoadingSpinner fullScreen label="Loading product..." />;
  if (!product) return null;

  const farmer = product.farmer || {};
  const outOfStock = !product.isAvailable || product.quantity <= 0;
  const maxQty = product.quantity;

  const handleAdd = async () => {
    if (!user) {
      toast.warning('Please login as a buyer to add items to cart');
      navigate('/login');
      return;
    }
    if (user.role !== 'buyer') {
      toast.warning('Only buyers can add products to the cart');
      return;
    }
    setAdding(true);
    try {
      await addToCart(product._id, quantity);
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user || user.role !== 'buyer') {
      toast.warning('Please login as a buyer to place an order');
      navigate('/login');
      return;
    }
    try {
      await addToCart(product._id, quantity);
      navigate('/buyer/cart');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleFavorite = async () => {
    if (!user || user.role !== 'buyer') {
      toast.warning('Sign in as a buyer to save favorite farmers.');
      navigate('/login');
      return;
    }
    try {
      const farmerId = farmer._id || farmer;
      const { data } = await userService.toggleFavorite(farmerId);
      setFavorited(Boolean(data.data?.favorited));
      toast.success(data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update favorites.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="card overflow-hidden">
          <div className="h-80 sm:h-96 bg-gradient-to-br from-primary-50 to-earth-50 flex items-center justify-center">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10rem]">{categoryIcons[product.category] || '🌱'}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="badge bg-primary-100 text-primary-700">
              {categoryIcons[product.category]} {product.category}
            </span>
            {outOfStock ? (
              <span className="badge bg-red-100 text-red-700">Out of Stock</span>
            ) : (
              <span className="badge bg-green-100 text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Available
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {product.location || farmer.farmLocation || 'India'}
            </span>
            {product.rating > 0 && (
              <span className="flex items-center gap-1 text-amber-500" aria-label={`${product.rating} out of 5 stars`}>
                <Star className="w-4 h-4 fill-amber-500" /> {product.rating} ({product.reviewCount || 0})
              </span>
            )}
            {farmer.rating && (
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-amber-500" /> {farmer.rating}
              </span>
            )}
          </div>

          <div className="mt-5 flex items-end gap-3">
            <p className="text-4xl font-extrabold text-primary-700">{formatCurrency(product.pricePerUnit)}</p>
            <span className="text-gray-500 mb-1">per {product.unit}</span>
          </div>

          <p className="mt-5 text-gray-600 leading-relaxed">{product.description || 'No description provided.'}</p>

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> Available Quantity
              </p>
              <p className="font-semibold text-gray-800 mt-1">
                {product.quantity} {product.unit}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Min Order
              </p>
              <p className="font-semibold text-gray-800 mt-1">
                {product.minOrderQuantity} {product.unit}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Harvest Date
              </p>
              <p className="font-semibold text-gray-800 mt-1">{formatDate(product.harvestDate)}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Category
              </p>
              <p className="font-semibold text-gray-800 mt-1">{product.category}</p>
            </div>
          </div>

          {/* Quantity + actions */}
          {!outOfStock && (
            <div className="mt-6">
              <label className="label">Select Quantity ({product.unit})</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(product.minOrderQuantity, q - 1))}
                    className="p-2.5 text-gray-600 hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    min={product.minOrderQuantity}
                    max={maxQty}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setQuantity(Math.min(maxQty, Math.max(product.minOrderQuantity, v || product.minOrderQuantity)));
                    }}
                    className="w-16 text-center border-0 focus:ring-0 font-semibold"
                  />
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="p-2.5 text-gray-600 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Subtotal: <span className="font-bold text-gray-800">{formatCurrency(product.pricePerUnit * quantity)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={handleAdd} disabled={outOfStock || adding} className="btn-secondary flex-1 h-12">
              <ShoppingCart className="w-5 h-5" /> {adding ? 'Adding...' : 'Add to Cart'}
            </button>
            <button onClick={handleBuyNow} disabled={outOfStock} className="btn-primary flex-1 h-12">
              Buy Now
            </button>
          </div>

          {/* Farmer info */}
          <div className="mt-6 card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Sold by</p>
              <button type="button" onClick={handleFavorite} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" aria-pressed={favorited}>
                <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} /> {favorited ? 'Favorited' : 'Favorite farmer'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{farmer.name || 'Farmer'}</p>
                <p className="text-sm text-gray-500">{farmer.farmName || 'Farm'}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {farmer.farmLocation || farmer.location || 'India'}
                </p>
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  <span className="font-semibold">Payout UPI required:</span> {farmer.upiId || 'Farmer has not added payout UPI yet'}
                </div>
              </div>
              {farmer.phone && (
                <a href={`tel:${farmer.phone}`} className="btn-secondary !py-2 !px-3 text-xs">
                  <Phone className="w-4 h-4" /> Contact
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <ReviewSection type="product" targetId={product._id} title="Product reviews" />
    </div>
  );
};

export default ProductDetails;
