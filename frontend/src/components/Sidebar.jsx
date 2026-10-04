import { NavLink, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';

/**
 * Sidebar - dashboard navigation. Links are passed in per role.
 */
const Sidebar = ({ links, open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-[#101812]/50 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[272px] flex-col border-r border-emerald-300/15 bg-[#07110d] text-white shadow-[10px_0_40px_-25px_rgba(0,0,0,.9)] transition-transform duration-300 lg:sticky ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-lime-200/30 bg-lime-300/10 shadow-[0_0_24px_rgba(163,230,53,.16)]">
              <Leaf className="h-4 w-4 text-lime-300" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Agri<span className="text-lime-300">Connect</span>
            </span>
          </NavLink>
          <button onClick={onClose} className="text-white/50 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-5">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#afc5b3]">{user?.role} account</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 pt-5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition ${
                  isActive
                    ? 'bg-lime-300 text-[#102015] shadow-[0_0_24px_rgba(163,230,53,.16)]'
                    : 'text-white/65 hover:bg-white/[.07] hover:text-lime-100'
                }`
              }
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/65 transition hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
