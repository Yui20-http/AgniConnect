import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { MapPin, List, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { productService } from '../services';
import ProductGrid from '../components/ProductGrid';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

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
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState('list');

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'All',
    location: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    availableOnly: true,
    organicOnly: false,
    freshnessDays: '',
    radiusKm: '',
    nearLat: '',
    nearLng: '',
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
      if (filters.organicOnly) params.organicOnly = 'true';
      if (filters.freshnessDays) params.freshnessDays = filters.freshnessDays;
      if (filters.nearLat && filters.nearLng && filters.radiusKm) {
        params.nearLat = filters.nearLat;
        params.nearLng = filters.nearLng;
        params.radiusKm = filters.radiusKm;
      }

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
    setFilters({ category: 'All', location: '', minPrice: '', maxPrice: '', sort: 'newest', availableOnly: true, organicOnly: false, freshnessDays: '', radiusKm: '', nearLat: '', nearLng: '' });
    setSearch('');
    setPage(1);
    setSearchParams({});
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('This browser does not support location access.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFilters((current) => ({
          ...current,
          nearLat: String(coords.latitude),
          nearLng: String(coords.longitude),
          radiusKm: current.radiusKm || '50',
        }));
        setPage(1);
        setViewMode('map');
      },
      () => toast.warning('Location permission was not granted. You can still search by city.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const mapProducts = products.filter((product) => Number.isFinite(Number(product.coordinates?.lat)) && Number.isFinite(Number(product.coordinates?.lng)) && product.coordinates?.lat != null && product.coordinates?.lng != null);
  const mapCenter = filters.nearLat && filters.nearLng
    ? [Number(filters.nearLat), Number(filters.nearLng)]
    : mapProducts.length
      ? [Number(mapProducts[0].coordinates.lat), Number(mapProducts[0].coordinates.lng)]
      : [19.076, 72.8777];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div data-reveal className="marketplace-heading relative mb-7 overflow-hidden rounded-[2rem] border border-emerald-100/10 bg-[radial-gradient(ellipse_at_80%_20%,rgba(163,230,53,.12),transparent_34%),linear-gradient(125deg,#10231a,#0a1710_65%,#13251a)] px-6 py-7 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-8 -top-20 h-72 w-72 rounded-full border border-lime-100/10" />
        <div className="pointer-events-none absolute -right-1 -top-14 h-56 w-56 rounded-full border border-lime-100/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.22em] text-lime-300"><span className="live-dot" /> Direct from growers</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-white sm:text-5xl">The seasonal <span className="font-serif italic font-normal text-lime-300">market.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/60">Find nearby harvests, compare farms, and shop with confidence.</p>
        </div>
        <span className="rounded-full border border-emerald-100/15 bg-white/[.05] px-4 py-2 text-xs font-semibold text-emerald-50/80 backdrop-blur">{pagination.total} listings</span>
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} onSearch={handleSearch} />
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className="btn-secondary lg:hidden">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e9df] bg-white p-3">
        <button onClick={useMyLocation} className="btn-secondary !py-2 text-sm"><MapPin className="h-4 w-4" /> Use my location</button>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button onClick={() => setViewMode('list')} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}><List className="h-4 w-4" /> List</button>
          <button onClick={() => setViewMode('map')} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${viewMode === 'map' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}><MapIcon className="h-4 w-4" /> Map</button>
        </div>
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
          {viewMode === 'list' ? <ProductGrid products={products} loading={loading} /> : loading ? (
            <div className="card p-8 text-center text-sm text-gray-500">Loading nearby farms…</div>
          ) : mapProducts.length ? (
            <div className="card overflow-hidden">
              <div className="h-[560px]">
                <MapContainer center={mapCenter} zoom={filters.nearLat ? 10 : 7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {filters.nearLat && filters.nearLng && <Marker position={[Number(filters.nearLat), Number(filters.nearLng)]}><Popup>Your location</Popup></Marker>}
                  {mapProducts.map((product) => (
                    <Marker key={product._id} position={[Number(product.coordinates.lat), Number(product.coordinates.lng)]}>
                      <Popup><b>{product.name}</b><br />{product.farmer?.farmName || product.farmer?.name}<br />{product.distanceKm != null ? `${product.distanceKm} km away` : product.location}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center"><p className="font-semibold text-gray-800">No map coordinates for these listings yet</p><p className="mt-1 text-sm text-gray-500">Try a supported city or use your location to find geocoded farms.</p><button onClick={useMyLocation} className="btn-secondary mt-4"><MapPin className="h-4 w-4" /> Find nearby farms</button></div>
          )}

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
