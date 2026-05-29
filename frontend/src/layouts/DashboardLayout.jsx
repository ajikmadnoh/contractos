import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import NotificationBell from '../components/NotificationBell';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '⊞' },
  { label: 'Projects', path: '/dashboard/projects', icon: '📁' },
  { label: 'Finance', path: '/dashboard/finance', icon: '💰' },
  { label: 'Invoicing', path: '/dashboard/invoicing', icon: '🧾' },
  { label: 'HR', path: '/dashboard/hr', icon: '👥' },
  { label: 'Tender / BQ', path: '/dashboard/bq', icon: '📋' },
  { label: 'Inventory', path: '/dashboard/inventory', icon: '📦' },
  { label: 'Documents', path: '/dashboard/documents', icon: '📄' },
  { label: 'Profiles', path: '/dashboard/profiles', icon: '🏢' },
  { label: 'Safety', path: '/dashboard/safety', icon: '🛡️' },
  { label: 'CRM', path: '/dashboard/crm', icon: '🎯' },
  { label: 'Fleet', path: '/dashboard/fleet', icon: '🚛' },
  { label: 'Market Rates', path: '/dashboard/rates', icon: '📊' },
  { label: 'Users', path: '/dashboard/users', icon: '👤' },
  { label: 'Settings', path: '/dashboard/settings', icon: '⚙️' },
];

export default function DashboardLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-navy-dark overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-navy border-r border-navy-light flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-navy-light">
          <span className="text-gold font-bold text-xl tracking-wide">ContractOS</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gold text-navy-dark'
                    : 'text-gray-400 hover:text-white hover:bg-navy-light'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-navy-light">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-navy-dark font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-end gap-3 px-6 py-3 border-b border-navy-light bg-navy flex-shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
