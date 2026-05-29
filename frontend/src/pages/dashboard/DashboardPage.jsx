import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/Icon';
import api from '../../lib/api';

// ── Tiny sparkline ────────────────────────────────────────────────────────────
function Spark({ data = [], color = 'var(--accent)' }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, icon, spark, up }) {
  return (
    <div className="kpi">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span className="kpi-label">{label}</span>
        <Icon name={icon} size={14} style={{ color: 'var(--text-mute)' }} />
      </div>
      <div className="kpi-value">{value}</div>
      {sub && (
        <div className="kpi-foot">
          {up !== undefined && (
            <Icon name={up ? 'arrowU' : 'arrowD'} size={12}
              style={{ color: up ? 'var(--good)' : 'var(--danger)' }} />
          )}
          <span style={{ color: up === true ? 'var(--good)' : up === false ? 'var(--danger)' : 'var(--text-dim)' }}>
            {sub}
          </span>
        </div>
      )}
      {spark && (
        <div className="kpi-spark">
          <Spark data={spark} color={up === false ? 'var(--danger)' : 'var(--accent)'} />
        </div>
      )}
    </div>
  );
}

// ── Alert row ─────────────────────────────────────────────────────────────────
function AlertRow({ type, msg, time }) {
  const cls = type === 'danger' ? 'danger' : type === 'warn' ? 'warn' : 'info';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span className={`pill ${cls}`} style={{ marginTop: '1px', flexShrink: 0 }}>
        {type === 'danger' ? '!' : type === 'warn' ? '⚠' : 'i'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-2)' }}>{msg}</div>
        {time && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', marginTop: '2px' }}>{time}</div>}
      </div>
    </div>
  );
}

// ── Quick action ──────────────────────────────────────────────────────────────
function QuickAction({ icon, label, to }) {
  const navigate = useNavigate();
  return (
    <button
      className="btn ghost sm"
      onClick={() => navigate(to)}
      style={{ justifyContent: 'flex-start', width: '100%' }}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then(r => setProjects(r.data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active    = projects.filter(p => p.status === 'active').length;
  const onTime    = projects.filter(p => p.status === 'active' && p.health !== 'delayed').length;
  const delayed   = projects.filter(p => p.health === 'delayed' || p.status === 'delayed').length;
  const totalBudget = projects.reduce((s, p) => s + parseFloat(p.contract_value || p.budget || 0), 0);

  const fmt = (n) => {
    if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `RM ${(n / 1_000).toFixed(0)}K`;
    return `RM ${n.toFixed(0)}`;
  };

  const fmtShort = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';

  const MODULES = [
    { name: 'Projects',     path: '/dashboard/projects',   icon: 'building' },
    { name: 'Finance',      path: '/dashboard/finance',    icon: 'money' },
    { name: 'Invoicing',    path: '/dashboard/invoicing',  icon: 'doc' },
    { name: 'HR',           path: '/dashboard/hr',         icon: 'users' },
    { name: 'Tender / BQ',  path: '/dashboard/bq',         icon: 'hash' },
    { name: 'Inventory',    path: '/dashboard/inventory',  icon: 'inventory' },
    { name: 'Documents',    path: '/dashboard/documents',  icon: 'doc' },
    { name: 'Safety',       path: '/dashboard/safety',     icon: 'shield' },
    { name: 'CRM',          path: '/dashboard/crm',        icon: 'target' },
    { name: 'Fleet',        path: '/dashboard/fleet',      icon: 'truck' },
    { name: 'Market Rates', path: '/dashboard/rates',      icon: 'market' },
    { name: 'Profiles',     path: '/dashboard/profiles',   icon: 'contacts' },
  ];

  return (
    <>
      {/* Page header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-sub" style={{ textTransform: 'capitalize' }}>
            {user?.role} · Demo Construction Sdn Bhd
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn ghost sm" onClick={() => navigate('/dashboard/projects')}>
            <Icon name="building" size={14} /> Projects
          </button>
          <button className="btn primary sm" onClick={() => navigate('/dashboard/invoicing')}>
            <Icon name="plus" size={14} /> New Invoice
          </button>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── KPI strip ────────────────────────────────── */}
        <div className="kpi-grid">
          <KpiTile
            label="Active Projects"
            value={loading ? '—' : String(active)}
            sub={delayed ? `${delayed} delayed` : 'All on track'}
            icon="building"
            spark={[3, 4, 4, 5, active]}
            up={delayed === 0}
          />
          <KpiTile
            label="Portfolio Value"
            value={loading ? '—' : fmtShort(totalBudget)}
            sub="Total contract value"
            icon="money"
            spark={[40, 55, 60, 72, totalBudget / 1_000_000]}
          />
          <KpiTile
            label="On-Time Delivery"
            value={active ? `${Math.round((onTime / active) * 100)}%` : '—'}
            sub={`${onTime} of ${active} projects`}
            icon="check"
            spark={[70, 75, 80, 78, active ? Math.round((onTime / active) * 100) : 0]}
            up={active ? onTime / active > 0.8 : undefined}
          />
          <KpiTile
            label="Outstanding Inv."
            value="RM 0"
            sub="No overdue invoices"
            icon="doc"
            spark={[12, 8, 10, 6, 0]}
            up={true}
          />
          <KpiTile
            label="Staff On-Site"
            value="—"
            sub="Today's attendance"
            icon="users"
          />
        </div>

        {/* ── Main grid ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>

          {/* Left: projects table */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Active Projects</div>
                <div className="card-sub">{active} projects in progress</div>
              </div>
              <button className="btn ghost sm" onClick={() => navigate('/dashboard/projects')}>
                View all <Icon name="arrowR" size={12} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-mute)', padding: '32px' }}>
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && projects.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">
                          <div className="empty-icon">📁</div>
                          <div className="empty-title">No projects yet</div>
                          <div className="empty-sub">Create your first project to get started</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {projects.slice(0, 8).map(p => {
                    const pct = p.progress_pct ?? p.completion_pct ?? 0;
                    const statusCls = p.status === 'active' ? 'good'
                      : p.status === 'delayed' ? 'danger'
                      : p.status === 'completed' ? 'info' : 'muted';
                    return (
                      <tr
                        key={p.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard/projects')}
                      >
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)' }}>
                            {p.project_code || p.code || '—'}
                          </div>
                        </td>
                        <td>
                          <span className={`pill ${statusCls}`}>{p.status}</span>
                        </td>
                        <td className="tbl-mono">
                          {fmt(parseFloat(p.contract_value || p.budget || 0))}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: pct >= 80 ? 'var(--good)' : pct >= 40 ? 'var(--accent)' : 'var(--warn)',
                                borderRadius: '99px',
                              }} />
                            </div>
                            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', minWidth: '30px' }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Alerts */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Alerts</div>
                <span className="pill warn">
                  <Icon name="bell" size={10} />
                  {delayed > 0 ? delayed : 0}
                </span>
              </div>
              <div style={{ padding: '0 var(--sp-lg)' }}>
                {delayed > 0 ? (
                  <AlertRow type="warn" msg={`${delayed} project(s) flagged as delayed`} />
                ) : (
                  <AlertRow type="info" msg="No active alerts — system healthy" />
                )}
                <AlertRow type="info" msg="Road tax expiry checks pending" time="Fleet module" />
                <AlertRow type="warn" msg="Low-stock items in inventory" time="Inventory module" />
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Quick Actions</div>
              </div>
              <div style={{ padding: 'var(--sp-sm) var(--sp-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <QuickAction icon="plus"      label="New Project"       to="/dashboard/projects" />
                <QuickAction icon="doc"       label="New Invoice"       to="/dashboard/invoicing" />
                <QuickAction icon="hash"      label="Create BQ"         to="/dashboard/bq" />
                <QuickAction icon="users"     label="Add Staff"         to="/dashboard/hr" />
                <QuickAction icon="shield"    label="Report Incident"   to="/dashboard/safety" />
                <QuickAction icon="inventory" label="Stock Adjustment"  to="/dashboard/inventory" />
              </div>
            </div>

            {/* Modules grid */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">All Modules</div>
              </div>
              <div style={{ padding: 'var(--sp-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {MODULES.map(m => (
                  <button
                    key={m.path}
                    className="btn ghost sm"
                    onClick={() => navigate(m.path)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <Icon name={m.icon} size={13} />
                    <span style={{ fontSize: 'var(--font-xs)' }}>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
