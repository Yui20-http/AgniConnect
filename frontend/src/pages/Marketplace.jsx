import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { productService } from '../services';
import ProductGrid from '../components/ProductGrid';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import { useSocket } from '../context/SocketContext';

/**
 * Marketplace - browse, search, filter and sort all products.
 */
const Marketplace = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const { socket } = useSocket();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'All',
    location: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    availableOnly: true,
  });
  const [page, setPage] = useState(1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        sort: filters.sort,
      };
      if (search) params.search = search;
      if (filters.category && filters.category !== 'All') params.category = filters.category;
      if (filters.location) params.location = filters.location;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.availableOnly) params.available = 'true';

      const { data } = await productService.getAll(params);
      setProducts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, filters, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Refresh when a product's stock changes in real time.
  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchProducts();
    socket.on('product:updated', handler);
    return () => socket.off('product:updated', handler);
  }, [socket, fetchProducts]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
    setSearchParams(value ? { search: value } : {});
  };

  const resetFilters = () => {
    setFilters({ category: 'All', location: '', minPrice: '', maxPrice: '', sort: 'newest', availableOnly: true });
    setSearch('');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-500 mt-1">
          {pagination.total} fresh products from farmers across India
        </p>
      </div>

      <div className="mb-6 flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} onSearch={handleSearch} />
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className="btn-secondary lg:hidden">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters - desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <FilterPanel filters={filters} setFilters={setFilters} onReset={resetFilters} />
          </div>
        </div>

        {/* Filters - mobile drawer */}
        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Filters</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterPanel filters={filters} setFilters={setFilters} onReset={resetFilters} />
            </div>
          </div>
        )}

        {/* Products */}
        <div className="lg:col-span-3">
          <ProductGrid products={products} loading={loading} />

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary !py-2"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 px-3">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="btn-secondary !py-2"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
