import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/Icon';
import api from '../../lib/api';

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Spark({ data = [], color = 'var(--accent)', fill = false }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 88, H = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(' ');
  const area = `${pts[0].split(',')[0]},${H} ` + polyline + ` ${pts[pts.length - 1].split(',')[0]},${H}`;
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      {fill && <polygon points={area} fill={color} opacity="0.12" />}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, icon, spark, color, up, loading }) {
  const trendColor = up === true ? 'var(--good)' : up === false ? 'var(--danger)' : (color || 'var(--accent)');
  return (
    <div className="kpi">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span className="kpi-label">{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', flexShrink: 0 }}>
          <Icon name={icon} size={14} />
        </div>
      </div>
      <div className="kpi-value" style={{ color: loading ? 'var(--text-mute)' : 'var(--text)' }}>
        {loading ? '—' : value}
      </div>
      {sub && (
        <div className="kpi-foot">
          {up !== undefined && (
            <Icon name={up ? 'arrowU' : 'arrowD'} size={11}
              style={{ color: trendColor, flexShrink: 0 }} />
          )}
          <span style={{ color: up === true ? 'var(--good)' : up === false ? 'var(--danger)' : 'var(--text-dim)', fontSize: '11px' }}>
            {sub}
          </span>
        </div>
      )}
      {spark && spark.length > 1 && (
        <div className="kpi-spark">
          <Spark data={spark} color={trendColor} fill />
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRM = (n) => {
  n = parseFloat(n || 0);
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `RM ${(n / 1_000).toFixed(0)}K`;
  return `RM ${n.toFixed(0)}`;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isExpiringSoon = (dateStr, days = 60) => {
  if (!dateStr) return false;
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  // ── Data fetches ──────────────────────────────────────────────────────────
  const { data: projData, isLoading: loadingProj } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const { data: invData } = useQuery({
    queryKey: ['invoices-dash'],
    queryFn: () => api.get('/invoices').then(r => r.data),
  });

  const { data: attData } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/hr/attendance').then(r => r.data),
  });

  const { data: invItemsData } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.get('/inventory/items').then(r => r.data),
  });

  const { data: fleetData } = useQuery({
    queryKey: ['fleet-vehicles'],
    queryFn: () => api.get('/fleet/vehicles').then(r => r.data),
  });

  const { data: claimsData } = useQuery({
    queryKey: ['claims'],
    queryFn: () => api.get('/finance/claims').then(r => r.data),
  });

  // ── Derived metrics ───────────────────────────────────────────────────────
  const projects   = projData?.projects || projData || [];
  const invoices   = invData?.invoices  || invData  || [];
  const attendance = attData?.records   || attData  || [];
  const invItems   = invItemsData?.items || [];
  const vehicles   = fleetData?.vehicles || [];
  const claims     = claimsData?.claims  || claimsData || [];

  const active   = projects.filter(p => p.status === 'active').length;
  const delayed  = projects.filter(p => p.status === 'delayed').length;
  const onTime   = active - delayed;
  const totalCV  = projects.reduce((s, p) => s + parseFloat(p.contract_value || p.contract_sum || 0), 0);

  const outstanding = invoices
    .filter(i => ['unpaid', 'overdue', 'partially_paid'].includes(i.status))
    .reduce((s, i) => s + (parseFloat(i.total || 0) - parseFloat(i.amount_paid || 0)), 0);
  const overdueInv = invoices.filter(i => i.status === 'overdue').length;

  const todayStr     = today();
  const staffToday   = attendance.filter(a => a.clock_in?.startsWith(todayStr) && !a.clock_out).length;
  const staffIn      = attendance.filter(a => a.clock_in?.startsWith(todayStr)).length;

  const lowStock     = invItems.filter(i => parseFloat(i.quantity) <= parseFloat(i.reorder_level || 0));
  const totalStockVal = invItems.reduce((s, i) => s + parseFloat(i.quantity || 0) * parseFloat(i.unit_cost || 0), 0);

  const expiringRT   = vehicles.filter(v => isExpiringSoon(v.road_tax_expiry || v.roadtax_expiry));
  const expiringIns  = vehicles.filter(v => isExpiringSoon(v.insurance_expiry));

  const onTimePct  = active > 0 ? Math.round((onTime / active) * 100) : 100;

  // Claims outstanding
  const claimsOutstanding = claims.filter(c => !['paid', 'rejected'].includes(c.status))
    .reduce((s, c) => s + parseFloat(c.amount || 0), 0);

  // Greeting
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  // ── Alerts list (real data) ───────────────────────────────────────────────
  const alerts = [
    ...( delayed > 0 ? [{ type: 'danger', msg: `${delayed} project(s) behind schedule`, mod: 'Projects' }] : [] ),
    ...( overdueInv > 0 ? [{ type: 'danger', msg: `${overdueInv} overdue invoice(s) — RM ${outstanding.toLocaleString('en-MY', {maximumFractionDigits:0})} outstanding`, mod: 'Finance' }] : [] ),
    ...( lowStock.length > 0 ? [{ type: 'warn', msg: `${lowStock.length} inventory item(s) below reorder level`, mod: 'Inventory' }] : [] ),
    ...( expiringRT.length > 0 ? [{ type: 'warn', msg: `${expiringRT.length} vehicle(s) with road tax expiring within 60 days`, mod: 'Fleet' }] : [] ),
    ...( expiringIns.length > 0 ? [{ type: 'warn', msg: `${expiringIns.length} vehicle(s) with insurance expiring within 60 days`, mod: 'Fleet' }] : [] ),
  ];
  if (!alerts.length) alerts.push({ type: 'info', msg: 'All systems green — no active alerts', mod: '' });

  const MODULES = [
    { name: 'Projects',    path: '/dashboard/projects',   icon: 'building' },
    { name: 'Finance',     path: '/dashboard/finance',    icon: 'money' },
    { name: 'Invoicing',   path: '/dashboard/invoicing',  icon: 'doc' },
    { name: 'HR',          path: '/dashboard/hr',         icon: 'users' },
    { name: 'BQ',          path: '/dashboard/bq',         icon: 'hash' },
    { name: 'Inventory',   path: '/dashboard/inventory',  icon: 'inventory' },
    { name: 'Documents',   path: '/dashboard/documents',  icon: 'doc' },
    { name: 'Safety',      path: '/dashboard/safety',     icon: 'shield' },
    { name: 'CRM',         path: '/dashboard/crm',        icon: 'target' },
    { name: 'Fleet',       path: '/dashboard/fleet',      icon: 'truck' },
    { name: 'Rates',       path: '/dashboard/rates',      icon: 'market' },
    { name: 'Profiles',    path: '/dashboard/profiles',   icon: 'contacts' },
  ];

  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────── */}
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

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── KPI STRIP ────────────────────────────────── */}
        <div className="kpi-grid">
          <KpiTile
            label="Active Projects"
            value={String(active)}
            sub={delayed > 0 ? `${delayed} delayed` : 'All on schedule'}
            icon="building"
            up={delayed === 0}
            loading={loadingProj}
            spark={projects.length ? [Math.max(active - 2, 0), Math.max(active - 1, 0), active] : []}
          />
          <KpiTile
            label="Portfolio Value"
            value={fmtRM(totalCV)}
            sub={`${projects.length} total projects`}
            icon="money"
            loading={loadingProj}
          />
          <KpiTile
            label="On-Time Rate"
            value={active > 0 ? `${onTimePct}%` : '—'}
            sub={`${onTime} of ${active} on schedule`}
            icon="check"
            up={onTimePct >= 80}
            loading={loadingProj}
            spark={active > 0 ? [Math.max(onTimePct - 10, 0), Math.max(onTimePct - 5, 0), onTimePct] : []}
          />
          <KpiTile
            label="Outstanding Inv."
            value={fmtRM(outstanding)}
            sub={overdueInv > 0 ? `${overdueInv} overdue` : 'No overdue invoices'}
            icon="doc"
            up={overdueInv === 0}
            spark={outstanding > 0 ? [outstanding * 1.3, outstanding * 1.1, outstanding] : [0, 0, 0]}
          />
          <KpiTile
            label="Staff On-Site"
            value={staffToday > 0 ? String(staffToday) : staffIn > 0 ? String(staffIn) : '—'}
            sub={staffIn > 0 ? `${staffIn} clocked in today` : 'No records today'}
            icon="users"
          />
          <KpiTile
            label="Low Stock Items"
            value={String(lowStock.length)}
            sub={lowStock.length > 0 ? `of ${invItems.length} items` : 'All items adequate'}
            icon="alert"
            up={lowStock.length === 0}
            color="var(--warn)"
          />
        </div>

        {/* ── MAIN 2-COLUMN GRID ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

          {/* Left: Projects table */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Active Projects</div>
                <div className="card-sub">{active} in progress · {fmtRM(totalCV)} portfolio</div>
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
                    <th style={{ minWidth: 140 }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProj && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mute)' }}>
                        Loading projects…
                      </td>
                    </tr>
                  )}
                  {!loadingProj && projects.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty" style={{ padding: '48px' }}>
                          <Icon name="building" size={32} style={{ color: 'var(--border-strong)' }} />
                          <div className="empty-title">No projects yet</div>
                          <div className="empty-sub">Create your first project to get started</div>
                          <button className="btn primary sm" onClick={() => navigate('/dashboard/projects')}
                            style={{ marginTop: '14px' }}>
                            <Icon name="plus" size={13} /> New Project
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {projects.slice(0, 8).map(p => {
                    const pct = parseFloat(p.progress_pct ?? p.completion_pct ?? 0);
                    const statusCls = { active: 'good', delayed: 'danger', completed: 'info', on_hold: 'warn' }[p.status] || 'muted';
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard/projects')}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-mute)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                            {p.project_number || p.project_code || '—'}
                          </div>
                        </td>
                        <td><span className={`pill ${statusCls}`}>{p.status}</span></td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-2)' }}>
                          {fmtRM(p.contract_value || p.contract_sum)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '5px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: pct >= 80 ? 'var(--good)' : pct >= 40 ? 'var(--accent)' : 'var(--warn)',
                                borderRadius: '99px',
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', minWidth: '32px', textAlign: 'right' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Alerts */}
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Alerts</div>
                  <div className="card-sub">{alerts.filter(a => a.type !== 'info').length} active</div>
                </div>
                {alerts.some(a => a.type === 'danger') && (
                  <span className="pill danger"><Icon name="alert" size={10} /> Action needed</span>
                )}
              </div>
              <div style={{ padding: '4px 0' }}>
                {alerts.map((a, i) => {
                  const icon = a.type === 'danger' ? 'alert' : a.type === 'warn' ? 'alert' : 'check';
                  const bg   = a.type === 'danger' ? 'var(--danger-soft)' : a.type === 'warn' ? 'var(--warn-soft)' : 'var(--good-soft)';
                  const col  = a.type === 'danger' ? 'var(--danger)' : a.type === 'warn' ? 'var(--warn)' : 'var(--good)';
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '12px 20px',
                      borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <Icon name={icon} size={13} style={{ color: col }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.4 }}>{a.msg}</div>
                        {a.mod && (
                          <div style={{ fontSize: '11px', color: 'var(--text-mute)', marginTop: '3px' }}>{a.mod}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Finance snapshot */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Finance Snapshot</div>
                <button className="btn ghost sm" onClick={() => navigate('/dashboard/finance')}>
                  Open <Icon name="arrowR" size={12} />
                </button>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Total Billed',      value: fmtRM(claims.reduce((s, c) => s + parseFloat(c.amount || 0), 0)), color: 'var(--text)' },
                  { label: 'Claims Outstanding', value: fmtRM(claimsOutstanding), color: 'var(--warn)' },
                  { label: 'Invoices Overdue',   value: overdueInv > 0 ? `${overdueInv} invoice${overdueInv > 1 ? 's' : ''}` : 'None', color: overdueInv > 0 ? 'var(--danger)' : 'var(--good)' },
                  { label: 'Stock Value',        value: fmtRM(totalStockVal), color: 'var(--text)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{row.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: row.color, fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Quick Actions</div>
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { icon: 'plus',      label: 'New Project',   to: '/dashboard/projects' },
                  { icon: 'doc',       label: 'New Invoice',   to: '/dashboard/invoicing' },
                  { icon: 'hash',      label: 'Create BQ',     to: '/dashboard/bq' },
                  { icon: 'users',     label: 'Add Staff',     to: '/dashboard/hr' },
                  { icon: 'shield',    label: 'Safety Report', to: '/dashboard/safety' },
                  { icon: 'inventory', label: 'Adjust Stock',  to: '/dashboard/inventory' },
                ].map(a => (
                  <button key={a.to} className="btn ghost sm"
                    onClick={() => navigate(a.to)}
                    style={{ justifyContent: 'flex-start', fontSize: '12px' }}>
                    <Icon name={a.icon} size={13} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* All modules */}
            <div className="card">
              <div className="card-head"><div className="card-title">All Modules</div></div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {MODULES.map(m => (
                  <button key={m.path} className="btn ghost sm"
                    onClick={() => navigate(m.path)}
                    style={{ justifyContent: 'flex-start', fontSize: '12px' }}>
                    <Icon name={m.icon} size={13} />
                    {m.name}
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
