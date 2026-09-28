import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, Phone, User, Sprout, ShoppingBag, Truck, ArrowRight, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/helpers';

/**
 * Register page with role selection (farmer / buyer / delivery).
 */
const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'buyer',
    farmName: '',
    farmLocation: '',
    farmSizeAcres: '',
    farmingType: 'organic',
    cropCategories: '',
    yearsOfExperience: '',
    upiId: '',
    address: '',
    location: '',
    vehicleType: '',
    vehicleNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const dashboardPath = (role) =>
    ({ farmer: '/farmer', buyer: '/buyer', delivery: '/delivery', admin: '/admin' }[role] || '/');

  const roles = [
    { value: 'farmer', label: 'Farmer', icon: Sprout, desc: 'Sell your produce' },
    { value: 'buyer', label: 'Buyer', icon: ShoppingBag, desc: 'Buy fresh produce' },
    { value: 'delivery', label: 'Delivery Partner', icon: Truck, desc: 'Deliver orders' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      const user = await register(payload);
      toast.success('Registration successful! Welcome to AgriConnect.');
      navigate(dashboardPath(user.role));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - image */}
      <div className="hidden lg:block relative order-2 lg:order-1">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80"
          alt="Farm"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 to-primary-700/40" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-bold mb-3">Grow with AgriConnect.</h2>
          <p className="text-primary-100">
            Register today and become part of a transparent, fair agricultural marketplace.
          </p>
        </div>
      </div>

      {/* Right - form */}
      <div className="flex items-center justify-center p-6 sm:p-10 order-1 lg:order-2 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-gray-900">
              Agri<span className="text-primary-600">Connect</span>
            </span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-2 mb-6">Join the agricultural marketplace</p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({ ...form, role: r.value })}
                className={`p-3 rounded-xl border-2 text-center transition ${
                  form.role === r.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <r.icon className={`w-6 h-6 mx-auto mb-1 ${form.role === r.value ? 'text-primary-600' : 'text-gray-400'}`} />
                <p className="text-xs font-semibold text-gray-700">{r.label}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="input pl-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="input pl-11"
                  />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10 digit number"
                    className="input pl-11"
                  />
                </div>
              </div>
            </div>

            {/* Role-specific fields */}
            {form.role === 'farmer' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Farm Name</label>
                    <input
                      type="text"
                      value={form.farmName}
                      onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                      placeholder="e.g. Patil Krushi Farm"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Farm Location</label>
                    <input
                      type="text"
                      value={form.farmLocation}
                      onChange={(e) => setForm({ ...form, farmLocation: e.target.value })}
                      placeholder="e.g. Nashik, Maharashtra"
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Farm Size (acres)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.farmSizeAcres}
                      onChange={(e) => setForm({ ...form, farmSizeAcres: e.target.value })}
                      placeholder="e.g. 12.5"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Farming Type</label>
                    <select
                      value={form.farmingType}
                      onChange={(e) => setForm({ ...form, farmingType: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="organic">Organic</option>
                      <option value="conventional">Conventional</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Crop Categories</label>
                    <input
                      type="text"
                      value={form.cropCategories}
                      onChange={(e) => setForm({ ...form, cropCategories: e.target.value })}
                      placeholder="e.g. Vegetables, Fruits"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={form.yearsOfExperience}
                      onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                      placeholder="e.g. 8"
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">UPI ID for payouts (optional)</label>
                  <input
                    type="text"
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    placeholder="e.g. patil.farm@upi"
                    className="input"
                    required
                  />
                </div>
              </div>
            )}

            {form.role === 'delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle Type</label>
                  <input
                    type="text"
                    value={form.vehicleType}
                    onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    placeholder="e.g. Truck"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Vehicle Number</label>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                    placeholder="e.g. MH12 AB 1234"
                    className="input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Address / Location</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value, location: e.target.value })}
                  placeholder="e.g. Andheri West, Mumbai"
                  className="input pl-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="input pl-11"
                  />
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className="input pl-11"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-11">
              {loading ? 'Creating account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
