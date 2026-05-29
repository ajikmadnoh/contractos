import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import Icon from '../components/Icon';

const NAV = [
  {
    section: 'Core',
    items: [
      { label: 'Dashboard',    path: '/dashboard',            icon: 'dashboard', end: true },
      { label: 'Projects',     path: '/dashboard/projects',   icon: 'building' },
      { label: 'Finance',      path: '/dashboard/finance',    icon: 'money' },
      { label: 'Invoicing',    path: '/dashboard/invoicing',  icon: 'doc' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Tender / BQ',  path: '/dashboard/bq',         icon: 'hash' },
      { label: 'Inventory',    path: '/dashboard/inventory',   icon: 'inventory' },
      { label: 'Documents',    path: '/dashboard/documents',   icon: 'doc' },
      { label: 'Safety',       path: '/dashboard/safety',      icon: 'shield' },
      { label: 'Fleet',        path: '/dashboard/fleet',       icon: 'truck' },
    ],
  },
  {
    section: 'People & Market',
    items: [
      { label: 'HR',           path: '/dashboard/hr',          icon: 'users' },
      { label: 'CRM',          path: '/dashboard/crm',         icon: 'target' },
      { label: 'Profiles',     path: '/dashboard/profiles',    icon: 'contacts' },
      { label: 'Market Rates', path: '/dashboard/rates',       icon: 'market' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Users',        path: '/dashboard/users',       icon: 'user' },
      { label: 'Settings',     path: '/dashboard/settings',    icon: 'settings' },
    ],
  },
];

const CMD_ITEMS = [
  { label: 'Go to Dashboard',    path: '/dashboard',           icon: 'dashboard' },
  { label: 'Go to Projects',     path: '/dashboard/projects',  icon: 'building' },
  { label: 'Go to Finance',      path: '/dashboard/finance',   icon: 'money' },
  { label: 'Go to Invoicing',    path: '/dashboard/invoicing', icon: 'doc' },
  { label: 'Go to HR',           path: '/dashboard/hr',        icon: 'users' },
  { label: 'Go to CRM',          path: '/dashboard/crm',       icon: 'target' },
  { label: 'Go to Safety',       path: '/dashboard/safety',    icon: 'shield' },
  { label: 'Go to Fleet',        path: '/dashboard/fleet',     icon: 'truck' },
  { label: 'Go to Inventory',    path: '/dashboard/inventory', icon: 'inventory' },
  { label: 'Go to Documents',    path: '/dashboard/documents', icon: 'doc' },
  { label: 'Go to Market Rates', path: '/dashboard/rates',     icon: 'market' },
  { label: 'Go to Settings',     path: '/dashboard/settings',  icon: 'settings' },
];

function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(0);
  const navigate = useNavigate();

  const results = q.trim()
    ? CMD_ITEMS.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : CMD_ITEMS;

  useEffect(() => { setFocused(0); }, [q]);

  const go = useCallback((path) => {
    navigate(path);
    onClose();
    setQ('');
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setFocused(f => Math.min(f + 1, results.length - 1));
      if (e.key === 'ArrowUp')   setFocused(f => Math.max(f - 1, 0));
      if (e.key === 'Enter' && results[focused]) go(results[focused].path);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, focused, results, go, onClose]);

  if (!open) return null;
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <Icon name="search" size={18} style={{ color: 'var(--text-mute)' }} />
          <input
            autoFocus
            className="cmd-input"
            placeholder="Search pages, actions…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="cmd-results">
          {results.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-mute)', fontSize: 'var(--font-sm)' }}>
              No results
            </div>
          )}
          {results.map((item, i) => (
            <div
              key={item.path}
              className={`cmd-item${i === focused ? ' focused' : ''}`}
              onMouseEnter={() => setFocused(i)}
              onClick={() => go(item.path)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const sideWidth = sideCollapsed ? '64px' : '240px';

  return (
    <div
      className="app"
      style={{ '--sidebar-w': sideWidth }}
    >
      {/* ── SIDEBAR ────────────────────────────────── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">C</div>
          {!sideCollapsed && <span className="brand-name">ContractOS</span>}
        </div>

        {/* Nav */}
        <nav className="nav">
          {NAV.map(group => (
            <div key={group.section}>
              {!sideCollapsed && <div className="nav-section">{group.section}</div>}
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' active' : ''}`
                  }
                  title={sideCollapsed ? item.label : undefined}
                >
                  <Icon name={item.icon} size={16} />
                  {!sideCollapsed && item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Org / User footer */}
        <div className="sidebar-footer">
          {!sideCollapsed && (
            <div className="org-card">
              <div className="brand-mark" style={{ fontSize: '10px', width: '24px', height: '24px', borderRadius: '5px' }}>D</div>
              <div className="org-card-info">
                <div className="org-card-name">Demo Construction</div>
                <div className="org-card-tier">Business Plan</div>
              </div>
            </div>
          )}
          <div
            className="nav-item"
            onClick={handleLogout}
            style={{ marginTop: '4px', cursor: 'pointer', color: 'var(--danger)' }}
          >
            <Icon name="arrowR" size={16} />
            {!sideCollapsed && 'Sign out'}
          </div>
        </div>
      </aside>

      {/* ── TOPBAR ─────────────────────────────────── */}
      <header className="topbar">
        {/* Sidebar toggle */}
        <button
          className="icon-btn"
          onClick={() => setSideCollapsed(c => !c)}
          title="Toggle sidebar"
        >
          <Icon name="flow" size={16} />
        </button>

        {/* Tenant chip */}
        <div className="tenant-chip">
          <div className="brand-mark" style={{ width: '16px', height: '16px', fontSize: '8px', borderRadius: '4px' }}>D</div>
          Demo Construction Sdn Bhd
        </div>

        <div className="topbar-spacer" />

        {/* Search / command palette trigger */}
        <button
          className="search-trigger"
          onClick={() => setCmdOpen(true)}
        >
          <Icon name="search" size={14} />
          Search or jump to…
          <span className="kbd">⌘K</span>
        </button>

        {/* Bell */}
        <button className="icon-btn" title="Notifications">
          <Icon name="bell" size={16} />
        </button>

        {/* User pill */}
        <div className="user-pill">
          <div className="avatar">{initials}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text)' }}>
              {user?.name?.split(' ')[0] || 'User'}
            </span>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────── */}
      <main className="main">
        <Outlet />
      </main>

      {/* ── COMMAND PALETTE ────────────────────────── */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
