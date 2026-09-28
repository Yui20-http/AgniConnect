import { Link } from 'react-router-dom';
import { MapPin, ShoppingCart, Eye, Star } from 'lucide-react';
import { formatCurrency, categoryIcons } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

/**
 * ProductCard - used in the marketplace grid and on the landing page.
 */
const ProductCard = ({ product, onAddToCart }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const farmer = product.farmer || {};
  const outOfStock = !product.isAvailable || product.quantity <= 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.warning('Please login as a buyer to add items to cart');
      return;
    }
    if (user.role !== 'buyer') {
      toast.warning('Only buyers can add products to the cart');
      return;
    }
    try {
      await addToCart(product._id, product.minOrderQuantity || 1);
      toast.success(`${product.name} added to cart`);
      if (onAddToCart) onAddToCart();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not add to cart');
    }
  };

  return (
    <div className="card overflow-hidden group hover:shadow-card-hover transition-all duration-300 flex flex-col">
      <Link to={`/product/${product._id}`} className="relative block">
        <div className="h-44 bg-gradient-to-br from-primary-50 to-earth-50 flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="text-6xl">{categoryIcons[product.category] || '🌱'}</span>
          )}
        </div>
        <span className="absolute top-3 left-3 badge bg-white/90 text-gray-700 shadow-sm">
          {categoryIcons[product.category]} {product.category}
        </span>
        {product.isPreOrder && <span className="absolute bottom-3 left-3 badge bg-amber-100 text-amber-800 shadow-sm">Pre-order</span>}
        {outOfStock && (
          <span className="absolute top-3 right-3 badge bg-red-500 text-white">Out of Stock</span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to={`/product/${product._id}`}>
          <h3 className="font-bold text-gray-900 hover:text-primary-600 transition line-clamp-1">{product.name}</h3>
        </Link>

        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{product.location || farmer.farmLocation || 'India'}</span>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{farmer.name || 'Farmer'}</span>
          {farmer.rating && (
            <span className="flex items-center gap-0.5 text-amber-500 ml-1">
              <Star className="w-3 h-3 fill-amber-500" /> {farmer.rating}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xl font-bold text-primary-700">{formatCurrency(product.pricePerUnit)}</p>
            <p className="text-xs text-gray-400">per {product.unit}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-sm font-semibold text-gray-700">
              {product.quantity} {product.unit}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link to={`/product/${product._id}`} className="btn-secondary flex-1 !py-2 text-xs">
            <Eye className="w-4 h-4" /> Details
          </Link>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="btn-primary flex-1 !py-2 text-xs"
          >
            <ShoppingCart className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
