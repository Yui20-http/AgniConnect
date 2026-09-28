import { useEffect, useState } from 'react';
import { Users, Search, UserCheck, UserX, Trash2, Filter } from 'lucide-react';
import { adminService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatDate, initials } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const ROLES = ['All', 'farmer', 'buyer', 'delivery', 'admin'];

const roleColors = {
  farmer: 'bg-green-100 text-green-700',
  buyer: 'bg-blue-100 text-blue-700',
  delivery: 'bg-amber-100 text-amber-700',
  admin: 'bg-purple-100 text-purple-700',
};

/**
 * AdminUsers - user management: search, filter, activate/deactivate, delete.
 */
const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('All');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await adminService.users({ role, search });
      setUsers(data.data);
    } catch (err) {
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search]);

  const toggle = async (user) => {
    try {
      await adminService.toggleUser(user._id);
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update user');
    }
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteUser(deleteTarget._id);
      toast.success('User deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete user');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">{users.length} user(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email..."
              className="input pl-9 !py-2 sm:w-56"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input !py-2 sm:w-36">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === 'All' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullScreen label="Loading users..." />
      ) : users.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="No users found" message="Try a different search or filter." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge capitalize ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => toggle(u)}
                              className={`p-2 rounded-lg ${
                                u.isActive
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={u.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User" size="sm">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
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

export default AdminUsers;
