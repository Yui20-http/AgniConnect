import { useEffect, useState } from 'react';
import { Heart, MapPin, Star, Trash2 } from 'lucide-react';
import { userService } from '../../services';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const BuyerFavorites = () => {
  const { toast } = useToast();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await userService.getFavorites();
      setFarmers(data.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load favorite farmers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (farmerId) => {
    try {
      await userService.toggleFavorite(farmerId);
      setFarmers((current) => current.filter((farmer) => farmer._id !== farmerId));
      toast.success('Farmer removed from favorites');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update favorites');
    }
  };

  if (loading) return <LoadingSpinner fullScreen label="Loading favorites..." />;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Favorite Farmers</h2>
        <p className="mt-1 text-sm text-gray-500">Farmers you have saved for quick access.</p>
      </header>
      {!farmers.length ? (
        <div className="card"><EmptyState icon={Heart} title="No favorite farmers yet" message="Open a product and select Favorite Farmer to save a farm here." /></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {farmers.map((farmer) => (
            <article key={farmer._id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold">
                  {(farmer.farmName || farmer.name || 'F').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 truncate">{farmer.farmName || farmer.name}</h3>
                  <p className="text-sm text-gray-500">{farmer.name}</p>
                </div>
                <button title="Remove favorite" onClick={() => remove(farmer._id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{farmer.farmLocation || farmer.location || 'Location not set'}</span>
                {farmer.rating > 0 && <span className="inline-flex items-center gap-1 text-amber-600"><Star className="h-4 w-4 fill-amber-400" />{farmer.rating}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerFavorites;
