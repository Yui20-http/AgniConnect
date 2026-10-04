import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Menu, X, ShoppingCart, LogOut, LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/CartContext';
import NotificationDropdown from './NotificationDropdown';
import { initials } from '../utils/helpers';
import { useLocale } from '../context/LocaleContext';

/**
 * Navbar - public site navigation with auth-aware actions.
 */
const Navbar = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { locale, setLocale, t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const isLanding = location.pathname === '/';
  const displayName = user?.name || 'User';
  const firstName = displayName.split(' ')[0] || 'User';

  const dashboardPath = user
    ? { farmer: '/farmer', buyer: '/buyer', delivery: '/delivery', admin: '/admin' }[user.role]
    : '/login';

  const navLinks = [
    { label: t('Home'), to: '/' },
    { label: t('Marketplace'), to: '/marketplace' },
    { label: t('Market Prices'), to: '/market-prices' },
    { label: t('Compare'), to: '/compare' },
    { label: t('How It Works'), to: '/#how-it-works' },
    { label: t('About'), to: '/#about' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-300/15 bg-[#07110d]/90 shadow-[0_8px_36px_-16px_rgba(0,0,0,.8)] backdrop-blur-2xl transition-colors duration-300">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-10">
        <div className="flex h-[72px] items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-lime-300/30 bg-lime-300/10 shadow-[0_0_26px_rgba(163,230,53,.16)]">
              <Leaf className="h-5 w-5 text-lime-300" />
            </div>
            <span className="text-[19px] font-extrabold tracking-tight text-white">
              Agri<span className="text-lime-300">Connect</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 rounded-full border border-emerald-200/10 bg-white/[.04] p-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${location.pathname === link.to ? 'bg-lime-300 text-[#102015] shadow-[0_0_22px_rgba(163,230,53,.2)]' : 'text-white/65 hover:bg-white/10 hover:text-lime-200'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <select aria-label="Language" value={locale} onChange={(event) => setLocale(event.target.value)} className="rounded-full border border-emerald-200/20 bg-[#102018] px-2 py-2 text-xs text-emerald-100">
              <option value="en">EN</option><option value="hi">हिंदी</option><option value="mr">मराठी</option>
            </select>
            {user && user.role === 'buyer' && (
              <Link to="/buyer/cart" className="relative rounded-full border border-emerald-200/20 bg-white/[.05] p-2.5 text-emerald-100 transition hover:border-lime-300/60 hover:text-lime-200">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary-600 text-white text-[10px] font-bold">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {user && <NotificationDropdown />}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenu((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/[.05] py-1 pl-1 pr-3 transition hover:border-lime-300/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-300 text-xs font-bold text-[#102015]">
                    {initials(displayName)}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-emerald-50">{firstName}</span>
                </button>
                {userMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-emerald-200/15 bg-[#0d1b13] py-1.5 shadow-[0_18px_60px_-20px_rgba(0,0,0,.8)]">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <Link
                      to={dashboardPath}
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link
                      to={`${dashboardPath}/profile`}
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm">
                  {t('Login')}
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  {t('Register')}
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileOpen((o) => !o)} className="rounded-full border border-emerald-200/20 bg-white/[.05] p-2.5 text-emerald-100 lg:hidden">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-emerald-200/10 bg-[#09140e] px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-lime-300/10 hover:text-lime-200 rounded-lg"
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1">
                Login
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1">
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
