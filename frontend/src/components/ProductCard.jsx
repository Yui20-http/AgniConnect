import { Link } from 'react-router-dom';
import { MapPin, ShoppingCart, Eye, Star } from 'lucide-react';
import { formatCurrency, categoryIcons } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/useAuth';

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
    <article data-reveal className="tilt-card product-card group flex flex-col overflow-hidden rounded-[1.35rem] border border-[#e4e9df] bg-white transition duration-300 hover:border-[#c7d8bd] hover:shadow-[0_24px_55px_-35px_rgba(23,59,40,.45)]">
      <Link to={`/product/${product._id}`} className="relative block">
        <div className="product-image relative h-52 overflow-hidden bg-[#f0f3ed] sm:h-56">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <span className="text-6xl">{categoryIcons[product.category] || '🌱'}</span>
          )}
        </div>
        <div className="product-image-sheen pointer-events-none absolute inset-x-0 top-0 h-56 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#445044] shadow-sm backdrop-blur">
          {categoryIcons[product.category]} {product.category}
        </span>
        {product.isPreOrder && <span className="absolute bottom-3 left-3 badge bg-amber-100 text-amber-800 shadow-sm">Pre-order</span>}
        {outOfStock && (
          <span className="absolute top-3 right-3 badge bg-red-500 text-white">Out of Stock</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link to={`/product/${product._id}`}>
          <h3 className="line-clamp-1 text-lg font-semibold tracking-tight text-[#1c2a1f] transition group-hover:text-lime-200">{product.name}</h3>
        </Link>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#7b857a]">
          <MapPin className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{product.location || farmer.farmLocation || 'India'}</span>
        </div>
        {product.distanceKm != null && <p className="mt-1 text-xs font-medium text-primary-700">{product.distanceKm} km away</p>}

        <div className="mt-3 flex items-center gap-1.5 text-xs text-[#69766a]">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#eef4e9] text-[9px] font-bold uppercase text-[#347546]">{(farmer.farmName || farmer.name || 'F').slice(0, 1)}</span>
          <span className="font-semibold text-[#445044]">{farmer.farmName || farmer.name || 'Local farmer'}</span>
          {farmer.rating && (
            <span className="flex items-center gap-0.5 text-amber-500 ml-1">
              <Star className="w-3 h-3 fill-amber-500" /> {farmer.rating}
            </span>
          )}
          {farmer.farmingType === 'organic' && <span className="ml-auto badge bg-green-50 text-green-700">Organic</span>}
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-[#edf0ea] pt-4">
          <div>
            <p className="text-xl font-semibold tracking-tight text-[#1e3b28]">{formatCurrency(product.pricePerUnit)}</p>
            <p className="text-[11px] text-[#929b90]">per {product.unit}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-sm font-semibold text-gray-700">
              {product.quantity} {product.unit}
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Link to={`/product/${product._id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e2e8df] bg-white px-3 py-2.5 text-xs font-semibold text-[#49564a] transition hover:bg-[#f6f8f4]">
            <Eye className="w-4 h-4" /> Details
          </Link>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="btn-primary flex-1 !py-2.5 text-xs"
          >
            <ShoppingCart className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
