import { useEffect, useState } from 'react';
import { TrendingUp, Plus, Pencil, Trash2, Info } from 'lucide-react';
import { marketPriceService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDateTime, categoryIcons } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Dairy', 'Other'];
const UNITS = ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece', 'bundle'];

const emptyForm = {
  crop: '',
  category: 'Vegetables',
  currentPrice: '',
  previousPrice: '',
  unit: 'kg',
  location: '',
};

/**
 * AdminMarketPrices - create, update and delete demo market prices.
 */
const AdminMarketPrices = () => {
  const { toast } = useToast();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await marketPriceService.getAll();
      setPrices(data.data);
    } catch (err) {
      toast.error('Could not load market prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      crop: p.crop,
      category: p.category,
      currentPrice: p.currentPrice,
      previousPrice: p.previousPrice,
      unit: p.unit,
      location: p.location,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        await marketPriceService.update(editing._id, form);
        toast.success('Market price updated');
      } else {
        await marketPriceService.create(form);
        toast.success('Market price added');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save market price');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await marketPriceService.remove(deleteTarget._id);
      toast.success('Market price deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error('Could not delete market price');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Market Prices</h2>
          <p className="text-sm text-gray-500">{prices.length} crop price(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary !py-2">
          <Plus className="w-4 h-4" /> Add Price
        </button>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          These are <strong>demo values</strong> for the academic project. They are not live
          government mandi rates.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner fullScreen label="Loading market prices..." />
      ) : prices.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={TrendingUp}
            title="No market prices yet"
            message="Add your first crop price to get started."
            action={
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Price
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Crop</th>
                  <th className="px-4 py-3 font-semibold">Market</th>
                  <th className="px-4 py-3 font-semibold text-right">Current</th>
                  <th className="px-4 py-3 font-semibold text-right">Previous</th>
                  <th className="px-4 py-3 font-semibold text-right">Change</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prices.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{categoryIcons[p.category] || '🌱'}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{p.crop}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.location}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(p.currentPrice)}
                      <span className="block text-xs font-normal text-gray-400">/{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatCurrency(p.previousPrice)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          p.changePercent > 0
                            ? 'text-green-600'
                            : p.changePercent < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {p.changePercent > 0 ? '+' : ''}
                        {p.changePercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(p.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Market Price' : 'Add Market Price'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Crop Name *</label>
              <input
                required
                value={form.crop}
                onChange={(e) => setForm({ ...form, crop: e.target.value })}
                className="input"
                placeholder="e.g. Tomato"
              />
            </div>
            <div>
              <label className="label">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unit *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="input"
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Current Price (₹) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.currentPrice}
                onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Previous Price (₹) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.previousPrice}
                onChange={(e) => setForm({ ...form, previousPrice: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Market Location *</label>
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input"
                placeholder="e.g. Pune"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Market Price" size="sm">
        <p className="text-sm text-gray-600">
          Delete price for <strong>{deleteTarget?.crop}</strong>?
        </p>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleDelete} className="btn bg-red-600 text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminMarketPrices;
