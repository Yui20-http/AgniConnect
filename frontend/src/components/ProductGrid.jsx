import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import { PackageSearch } from 'lucide-react';

/**
 * ProductGrid - responsive grid of ProductCards with loading / empty states.
 */
const ProductGrid = ({ products, loading, emptyMessage }) => {
  if (loading) return <LoadingSpinner label="Loading products..." />;

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products found"
        message={emptyMessage || 'Try adjusting your search or filters.'}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
