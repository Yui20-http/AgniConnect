import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationDropdown from '../components/NotificationDropdown';
import { useAuth } from '../context/useAuth';

/**
 * DashboardLayout - sidebar + topbar shell for all dashboards.
 */
const DashboardLayout = ({ links, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex bg-[radial-gradient(ellipse_at_top_left,_rgba(27,70,45,.36),_transparent_48%),#08120d]">
      <Sidebar links={links} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-emerald-200/10 bg-[#08120d]/85 px-4 text-white backdrop-blur-2xl sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-gray-600 hover:bg-white lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">AgriConnect workspace</p>
              <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200/15 bg-white/[.04] px-2 py-1 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-300 text-xs font-bold text-[#102015]">
                {user?.name?.charAt(0)}
              </div>
              <span className="text-sm font-medium text-emerald-50">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-7 lg:p-9 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
