import { SlidersHorizontal, X } from 'lucide-react';

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Dairy', 'Other'];

/**
 * FilterPanel - category, price and sort filters for the marketplace.
 */
const FilterPanel = ({ filters, setFilters, onReset }) => {
  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </h3>
        <button onClick={onReset} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
          <X className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="label">Category</label>
          <select value={filters.category} onChange={(e) => update('category', e.target.value)} className="input">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Location</label>
          <input
            type="text"
            value={filters.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="e.g. Nashik"
            className="input"
          />
        </div>

        <div>
          <label className="label">Nearby distance</label>
          <select value={filters.radiusKm} onChange={(e) => update('radiusKm', e.target.value)} className="input">
            <option value="">Any distance</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
            <option value="100">Within 100 km</option>
          </select>
          {!filters.nearLat && <p className="mt-1 text-xs text-gray-500">Use your location to apply distance.</p>}
        </div>

        <div>
          <label className="label">Freshness</label>
          <select value={filters.freshnessDays} onChange={(e) => update('freshnessDays', e.target.value)} className="input">
            <option value="">Any harvest date</option>
            <option value="3">Harvested in last 3 days</option>
            <option value="7">Harvested in last 7 days</option>
            <option value="14">Harvested in last 14 days</option>
            <option value="30">Harvested in last 30 days</option>
          </select>
        </div>

        <div>
          <label className="label">Price Range (₹)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => update('minPrice', e.target.value)}
              placeholder="Min"
              className="input"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => update('maxPrice', e.target.value)}
              placeholder="Max"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Sort By</label>
          <select value={filters.sort} onChange={(e) => update('sort', e.target.value)} className="input">
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="availableOnly"
            checked={filters.availableOnly}
            onChange={(e) => update('availableOnly', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="availableOnly" className="text-sm text-gray-700">
            Show available only
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="organicOnly" checked={filters.organicOnly} onChange={(e) => update('organicOnly', e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          <label htmlFor="organicOnly" className="text-sm text-gray-700">Organic farms only</label>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
