import { Search, X } from 'lucide-react';

/**
 * SearchBar - controlled search input with a clear button.
 */
const SearchBar = ({ value, onChange, onSearch, placeholder = 'Search products, farmers, locations...' }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-11 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onSearch) onSearch('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
};

export default SearchBar;
