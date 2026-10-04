import { useState } from 'react';
import { User, Save, Mail, Phone, MapPin, Lock } from 'lucide-react';
import { userService } from '../services';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';
import { initials } from '../utils/helpers';

/**
 * ProfileForm - shared profile editor used by farmer / buyer / delivery pages.
 * `extraFields` lets each role add its own inputs (farm name, vehicle, etc.).
 */
const ProfileForm = ({ title, subtitle, extraFields = [] }) => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    location: user?.location || '',
    farmName: user?.farmName || '',
    farmLocation: user?.farmLocation || '',
    farmSizeAcres: user?.farmSizeAcres || '',
    farmingType: user?.farmingType || 'organic',
    cropCategories: user?.cropCategories?.join(', ') || '',
    yearsOfExperience: user?.yearsOfExperience || '',
    upiId: user?.upiId || '',
    vehicleType: user?.vehicleType || '',
    vehicleNumber: user?.vehicleNumber || '',
    password: '',
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const { data } = await userService.updateProfile(payload);
      updateUser(data.data);
      toast.success('Profile updated successfully');
      set('password', '');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl font-bold">
          {initials(user?.name)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
          <span className="badge bg-primary-50 text-primary-700 mt-1 capitalize">{user?.role}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <input value={user?.email || ''} disabled className="input bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="input"
              maxLength={10}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </label>
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className="input"
              placeholder="City, State"
            />
          </div>

          {extraFields.map((f) => (
            <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
              <label className="label">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={form[f.key] || f.options?.[0]?.value || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="input"
                  required={f.required}
                >
                  {f.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form[f.key] || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="input"
                  placeholder={f.placeholder}
                  type={f.type || 'text'}
                  min={f.min}
                  step={f.step}
                  required={f.required}
                />
              )}
            </div>
          ))}

          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className="input"
              placeholder="Full address"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> New Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="input"
              placeholder="Leave blank to keep current password"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
