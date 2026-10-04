import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/helpers';

/**
 * Login page with role-aware dashboard redirect.
 */
const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const dashboardPath = (role) =>
    ({ farmer: '/farmer', buyer: '/buyer', delivery: '/delivery', admin: '/admin' }[role] || '/');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(dashboardPath(user.role));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email, password) => {
    setForm({ email, password });
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@agriconnect.com', password: 'Admin@123', color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-gray-900">
              Agri<span className="text-primary-600">Connect</span>
            </span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-2 mb-8">Login to your AgriConnect account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
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
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="input pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-11">
              {loading ? 'Logging in...' : 'Login'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link to="/forgot-password" className="link">Forgot your password?</Link>
          </p>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="link">
              Register here
            </Link>
          </p>

          {/* Admin-only demo access */}
          <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Admin Demo Login
            </p>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((a) => (
                <button
                  key={a.label}
                  onClick={() => quickLogin(a.email, a.password)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-80 ${a.color}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Other roles should register from the register page.
            </p>
          </div>
        </div>
      </div>

      {/* Right - image */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80"
          alt="Farm"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 to-primary-700/40" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-bold mb-3">Fresh produce, fair prices.</h2>
          <p className="text-primary-100">
            Join thousands of farmers and buyers building a better agricultural supply chain.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
