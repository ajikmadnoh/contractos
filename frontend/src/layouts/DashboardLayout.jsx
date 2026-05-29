import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import Icon from '../components/Icon';

const NAV = [
  {
    section: 'Workspace',
    items: [
      { label: 'Dashboard',    path: '/dashboard',            icon: 'dashboard', end: true },
      { label: 'Projects',     path: '/dashboard/projects',   icon: 'building',  badge: '7' },
      { label: 'Finance',      path: '/dashboard/finance',    icon: 'money' },
      { label: 'Invoicing',    path: '/dashboard/invoicing',  icon: 'doc',       badge: '3' },
      { label: 'Tender / BQ',  path: '/dashboard/bq',         icon: 'hash',      badge: '12' },
    ],
  },
  {
    section: 'Commercial',
    items: [
      { label: 'Inventory',    path: '/dashboard/inventory',   icon: 'inventory' },
      { label: 'Documents',    path: '/dashboard/documents',   icon: 'paperclip' },
      { label: 'Safety',       path: '/dashboard/safety',      icon: 'shield' },
      { label: 'Fleet',        path: '/dashboard/fleet',       icon: 'truck' },
    ],
  },
  {
    section: 'People & Market',
    items: [
      { label: 'HR & Payroll', path: '/dashboard/hr',          icon: 'users' },
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
  { label: 'Go to Dashboard',    path: '/dashboard',           icon: 'dashboard',  sub: 'Workspace overview' },
  { label: 'Go to Projects',     path: '/dashboard/projects',  icon: 'building',   sub: '7 active' },
  { label: 'Go to Finance',      path: '/dashboard/finance',   icon: 'money',      sub: 'Claims & payments' },
  { label: 'Go to Invoicing',    path: '/dashboard/invoicing', icon: 'doc',        sub: '3 due this week' },
  { label: 'Go to HR',           path: '/dashboard/hr',        icon: 'users',      sub: 'Attendance & payroll' },
  { label: 'Go to CRM',          path: '/dashboard/crm',       icon: 'target',     sub: 'Clients & subcons' },
  { label: 'Go to Safety',       path: '/dashboard/safety',    icon: 'shield',     sub: 'Incidents & SHASSIC' },
  { label: 'Go to Fleet',        path: '/dashboard/fleet',     icon: 'truck',      sub: 'Vehicles & plant' },
  { label: 'Go to Inventory',    path: '/dashboard/inventory', icon: 'inventory',  sub: '1,284 SKUs' },
  { label: 'Go to Documents',    path: '/dashboard/documents', icon: 'paperclip',  sub: 'Drawings & contracts' },
  { label: 'Go to Market Rates', path: '/dashboard/rates',     icon: 'market',     sub: 'Price benchmarks' },
  { label: 'Go to Settings',     path: '/dashboard/settings',  icon: 'settings',   sub: 'Company & API config' },
];

function BrandMark() {
  return (
    <div className="brand-mark-svg">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="13" width="4" height="8" rx="1" fill="currentColor" stroke="none"/>
        <rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor" stroke="none"/>
        <rect x="16" y="5" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>
        <path d="M3 21h18" />
      </svg>
    </div>
  );
}

function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(0);
  const navigate = useNavigate();

  const results = q.trim()
    ? CMD_ITEMS.filter(i => (i.label + i.sub).toLowerCase().includes(q.toLowerCase()))
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
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(11,19,32,.36)',
      backdropFilter: 'blur(2px)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '14vh', animation: 'rise .15s'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxWidth: '92vw',
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <Icon name="search" size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search pages, projects, actions…"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 14, color: 'var(--text)' }} />
          <kbd style={{ fontSize: 10, padding: '2px 5px', borderRadius: 3, background: 'var(--bg-2)', color: 'var(--text-dim)', fontFamily: 'inherit' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 6 }}>
          {results.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>No results</div>
          )}
          {results.map((it, i) => (
            <button key={it.path}
              onClick={() => go(it.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '10px 12px', borderRadius: 8, border: 0,
                background: i === focused ? 'var(--surface-2)' : 'transparent',
                textAlign: 'left', cursor: 'pointer'
              }}
              onMouseEnter={() => setFocused(i)}>
              <span style={{
                width: 28, height: 28, borderRadius: 6, background: 'var(--accent-soft)',
                color: 'var(--accent-2)', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0
              }}>
                <Icon name={it.icon} size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{it.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{it.sub}</div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.06em' }}>GO</span>
            </button>
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
  const [sideMode, setSideMode] = useState('full'); // 'full' | 'icon'

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

  const sideWidth = sideMode === 'full' ? '240px' : '64px';

  return (
    <div className="app" style={{ '--sidebar-w': sideWidth }}>

      {/* ── SIDEBAR ────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          {sideMode === 'full' && (
            <div className="brand-name-wrap">
              ContractOS
              <small>Construction Management</small>
            </div>
          )}
        </div>

        <nav className="nav">
          {NAV.map(group => (
            <div key={group.section}>
              {sideMode === 'full' && (
                <div className="nav-section">{group.section}</div>
              )}
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  title={sideMode !== 'full' ? item.label : undefined}
                  style={sideMode !== 'full' ? { justifyContent: 'center', padding: '9px' } : undefined}
                >
                  <Icon name={item.icon} size={16} />
                  {sideMode === 'full' && (
                    <>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="nav-badge">{item.badge}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {sideMode === 'full' && (
          <div className="sidebar-footer">
            <div className="org-card">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%'
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--magenta))',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, flexShrink: 0
                }}>PB</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="org-card-name">Permata Bina Group</div>
                  <div className="org-card-tier">Pro · 24 seats</div>
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Storage</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>12.4 / 50 GB</span>
              </div>
              <div className="mini-bar" style={{ marginTop: 4 }}><i style={{ width: '24%' }} /></div>
            </div>
            <button
              className="nav-item"
              onClick={handleLogout}
              style={{ marginTop: 4, color: 'var(--danger)', width: '100%' }}
            >
              <Icon name="arrowR" size={16} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <header className="topbar">
        <button className="icon-btn" onClick={() => setSideMode(m => m === 'full' ? 'icon' : 'full')}
          title="Toggle sidebar">
          <Icon name="flow" size={16} />
        </button>

        <div className="tenant-chip" title="Switch tenant">
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--magenta))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700
          }}>PB</div>
          <span style={{ fontWeight: 600 }}>Permata Bina Group</span>
          <Icon name="chevD" size={12} />
        </div>

        <div style={{ flex: 1 }} />

        <button className="search-trigger" onClick={() => setCmdOpen(true)} style={{ minWidth: 280, maxWidth: 460 }}>
          <Icon name="search" size={14} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search projects, claims, contacts…</span>
          <kbd style={{
            padding: '1px 6px', border: '1px solid var(--border)', borderBottomWidth: 2,
            borderRadius: 4, fontSize: 10, background: 'var(--surface)',
            color: 'var(--text-dim)', fontFamily: 'inherit'
          }}>⌘K</kbd>
        </button>

        <button className="icon-btn" title="Notifications" style={{ position: 'relative' }}>
          <Icon name="bell" size={16} />
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 6, height: 6, background: 'var(--danger)',
            borderRadius: '50%', boxShadow: '0 0 0 2px var(--surface)'
          }} />
        </button>

        <div className="user-pill" title="Account">
          <div className="avatar">{initials}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{user?.name?.split(' ')[0] || 'User'}</span>
            <span style={{ fontSize: 10, color: 'var(--text-mute)', textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
          <Icon name="chevD" size={12} />
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────── */}
      <main className="main">
        <Outlet />
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
