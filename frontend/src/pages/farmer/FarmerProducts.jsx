import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import { productService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate, categoryIcons } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Dairy', 'Other'];
const UNITS = ['kg', 'quintal', 'ton', 'dozen', 'litre', 'piece', 'bundle'];

const emptyForm = {
  name: '',
  category: 'Vegetables',
  description: '',
  quantity: '',
  unit: 'kg',
  pricePerUnit: '',
  minOrderQuantity: 1,
  harvestDate: '',
  isPreOrder: false,
  location: '',
  isAvailable: true,
};

/**
 * FarmerProducts - full CRUD for a farmer's product listings.
 */
const FarmerProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await productService.getMyProducts();
      setProducts(data.data);
    } catch (err) {
      toast.error('Could not load products');
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
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description || '',
      quantity: p.quantity,
      unit: p.unit,
      pricePerUnit: p.pricePerUnit,
      minOrderQuantity: p.minOrderQuantity || 1,
      harvestDate: p.harvestDate ? p.harvestDate.slice(0, 10) : '',
      isPreOrder: p.isPreOrder || false,
      location: p.location || '',
      isAvailable: p.isAvailable,
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      if (editing) {
        await productService.update(editing._id, fd);
        toast.success('Product updated successfully');
      } else {
        await productService.create(fd);
        toast.success('Product added successfully');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await productService.remove(deleteTarget._id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete product');
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner fullScreen label="Loading products..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Products</h2>
          <p className="text-sm text-gray-500">{products.length} listing(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input pl-9 !py-2 sm:w-52"
            />
          </div>
          <button onClick={openCreate} className="btn-primary !py-2">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="No products yet"
            message="Start by adding your first product listing."
            action={
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Product
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
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Price</th>
                  <th className="px-4 py-3 font-semibold text-right">Stock</th>
                  <th className="px-4 py-3 font-semibold">Harvest</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">{categoryIcons[p.category] || '🌱'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(p.pricePerUnit)}
                      <span className="block text-xs font-normal text-gray-400">/{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {p.quantity} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.harvestDate)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          p.isAvailable && p.quantity > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.isAvailable && p.quantity > 0 ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
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

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="e.g. Fresh Tomatoes"
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
              <label className="label">Price per Unit (₹) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerUnit}
                onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Available Quantity *</label>
              <input
                required
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Min Order Quantity</label>
              <input
                type="number"
                min="1"
                value={form.minOrderQuantity}
                onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Harvest Date</label>
              <input
                type="date"
                value={form.harvestDate}
                onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
            <div className="sm:col-span-2 flex items-center gap-2"><input type="checkbox" id="isPreOrder" checked={form.isPreOrder} onChange={(e) => setForm({ ...form, isPreOrder: e.target.checked })} className="rounded border-gray-300 text-primary-600" /><label htmlFor="isPreOrder" className="text-sm text-gray-700">Accept pre-orders for this upcoming harvest</label></div>
              <label className="label">Location *</label>
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input"
                placeholder="e.g. Nashik, Maharashtra"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
                placeholder="Describe quality, farming method, etc."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="input file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm file:font-medium"
              />
              {editing?.image && !imageFile && (
                <p className="text-xs text-gray-400 mt-1">Leave empty to keep the current image.</p>
              )}
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isAvailable" className="text-sm text-gray-700">
                Mark as available for sale
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot
          be undone.
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

export default FarmerProducts;
