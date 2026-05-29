import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/Icon';
import { Sparkline, CashflowChart, SCurve, Donut } from '../../components/Charts';
import api from '../../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRM = (n) => {
  n = parseFloat(n || 0);
  if (n >= 1_000_000_000) return `RM ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `RM ${(n / 1_000).toFixed(1)}k`;
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

// ── KPI Tile ──────────────────────────────────────────────────────────────────
function KpiTile({ id, label, value, unit, delta, deltaLabel, spark, sparkColor, loading, dragHandlers }) {
  return (
    <div className="kpi rise rise-1" data-kpi={id} {...dragHandlers}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: loading ? 'var(--text-mute)' : undefined }}>
        {loading ? '—' : value}
        {unit && <small style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 3 }}>{unit}</small>}
      </div>
      <div className="kpi-foot">
        {delta != null && (
          <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
            <Icon name={delta >= 0 ? 'arrowU' : 'arrowD'} size={11} />
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
        {deltaLabel && <span>{deltaLabel}</span>}
      </div>
      {spark && spark.length > 1 && (
        <div className="kpi-spark">
          <Sparkline data={spark} color={sparkColor || 'var(--accent)'} />
        </div>
      )}
    </div>
  );
}

// ── Cashflow Card ─────────────────────────────────────────────────────────────
function CashflowCard() {
  return (
    <div className="card rise rise-2">
      <div className="card-head">
        <div>
          <div className="card-title">Cashflow — next 90 days</div>
          <div className="card-sub">Certified vs invoiced vs received</div>
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        <div className="chart-legend">
          {[
            { label: 'Certified', color: 'var(--accent)' },
            { label: 'Invoiced',  color: 'var(--info)',   dash: true },
            { label: 'Received',  color: 'var(--good)' },
          ].map((it, i) => (
            <span key={i} className="chart-legend-item">
              <span style={{
                width: 14, height: 2, background: it.color, borderRadius: 1,
                ...(it.dash ? { background: `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 6px)` } : {})
              }} />
              {it.label}
            </span>
          ))}
        </div>
        <button className="btn sm ghost"><Icon name="more" size={12} /></button>
      </div>
      <div className="card-body" style={{ padding: '8px 8px 4px' }}>
        <CashflowChart height={240} />
        <div style={{ display: 'flex', gap: 24, padding: '12px 12px 4px', fontSize: 12 }}>
          <div>
            <div style={{ color: 'var(--text-dim)' }}>This week</div>
            <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>RM 6.4M certified</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)' }}>Forecast 90d</div>
            <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>RM 84.2M</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)' }}>Gap (cert→received)</div>
            <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--warn)' }}>−RM 12.1M</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alerts Card ───────────────────────────────────────────────────────────────
function AlertsCard({ alerts, onDismiss }) {
  return (
    <div className="card rise rise-3">
      <div className="card-head">
        <div className="card-title">Action queue</div>
        {alerts.filter(a => a.type === 'danger').length > 0 && (
          <span className="pill danger" style={{ marginLeft: 6 }}>
            {alerts.filter(a => a.type === 'danger').length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost">View all</button>
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {alerts.map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '12px 16px',
            borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 0
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: `var(--${a.type}-soft)`, color: `var(--${a.type})`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name={a.icon || 'alert'} size={14} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
                {a.time && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-mute)', flexShrink: 0 }}>{a.time}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.4 }}>{a.body}</div>
              {a.action && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn sm">{a.action}</button>
                  {onDismiss && (
                    <button className="btn sm ghost" onClick={() => onDismiss(i)}>Dismiss</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Projects Table ────────────────────────────────────────────────────────────
function ProjectsTable({ projects, loading, navigate }) {
  return (
    <div className="card rise rise-4">
      <div className="card-head">
        <div className="card-title">Active projects</div>
        <span className="card-sub" style={{ marginLeft: 6 }}>Live progress vs S-curve</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn sm ghost" aria-current="page">Live · {projects.filter(p => p.status === 'active').length}</button>
          <button className="btn sm ghost">Delayed · {projects.filter(p => p.status === 'delayed').length}</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Project</th>
              <th>PM</th>
              <th>Phase / Status</th>
              <th style={{ textAlign: 'right' }}>Contract</th>
              <th style={{ textAlign: 'right' }}>Certified</th>
              <th>S-Curve</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mute)' }}>
                  Loading projects…
                </td>
              </tr>
            )}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty" style={{ padding: '48px' }}>
                    <Icon name="building" size={32} style={{ color: 'var(--border-strong)' }} />
                    <div className="empty-title">No projects yet</div>
                    <div className="empty-sub">Create your first project to get started</div>
                    <button className="btn primary sm" onClick={() => navigate('/dashboard/projects')}
                      style={{ marginTop: 14 }}>
                      <Icon name="plus" size={13} /> New Project
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {projects.slice(0, 8).map((p) => {
              const pct = parseFloat(p.progress_pct ?? p.completion_pct ?? 0) / 100;
              const statusCls = { active: 'good', delayed: 'danger', completed: 'info', on_hold: 'warn' }[p.status] || 'outline';
              const code = (p.project_number || p.project_code || p.name || '').slice(0, 4).toUpperCase();
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/projects')}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        background: 'var(--accent-soft)', color: 'var(--accent-2)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace'
                      }}>{code}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          <Icon name="pin" size={10} />{p.location || p.project_number || '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>{p.pm || p.project_manager || '—'}</td>
                  <td><span className={`pill ${statusCls}`}>{p.status}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {fmtRM(p.contract_value || p.contract_sum)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {fmtRM((p.contract_value || p.contract_sum) * pct)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SCurve actual={pct} width={100} height={30} />
                      <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                        {Math.round(pct * 100)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <button className="btn sm ghost"><Icon name="chevR" size={12} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Utilisation Card ──────────────────────────────────────────────────────────
function UtilisationCard({ staffIn, staffTotal }) {
  const pct = staffTotal > 0 ? Math.round((staffIn / staffTotal) * 100) : 0;
  const segments = staffIn > 0 ? [
    { value: staffIn,             color: 'var(--accent)' },
    { value: Math.max(0, staffTotal - staffIn), color: 'var(--bg-2)' }
  ] : [{ value: 1, color: 'var(--bg-2)' }];

  return (
    <div className="card rise rise-5">
      <div className="card-head">
        <div className="card-title">Workforce utilisation</div>
        <span className="card-sub" style={{ marginLeft: 6 }}>Today</span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Donut size={160} thickness={20}
            label={`${pct}%`}
            sublabel={`${staffIn} / ${staffTotal || '—'} deployed`}
            segments={segments} />
        </div>
        <div className="util-legend">
          {[
            { c: 'var(--accent)', n: 'On-site today', v: staffIn },
            { c: 'var(--bg-2)',   n: 'Not deployed',  v: Math.max(0, staffTotal - staffIn) }
          ].map(s => (
            <div key={s.n} className="util-legend-row">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'var(--text-dim)' }}>{s.n}</span>
              <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Finance Snapshot ──────────────────────────────────────────────────────────
function FinanceCard({ claimsOutstanding, totalBilled, overdueInv, outstanding, navigate }) {
  return (
    <div className="card rise rise-5">
      <div className="card-head">
        <div className="card-title">Finance snapshot</div>
        <button className="btn sm ghost" onClick={() => navigate('/dashboard/finance')}>
          Open <Icon name="arrowR" size={12} />
        </button>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'Total billed',        value: fmtRM(totalBilled),        color: 'var(--text)' },
          { label: 'Claims outstanding',  value: fmtRM(claimsOutstanding),  color: 'var(--warn)' },
          { label: 'Outstanding invoices',value: fmtRM(outstanding),        color: overdueInv > 0 ? 'var(--danger)' : 'var(--good)' },
          { label: 'Invoices overdue',    value: overdueInv > 0 ? `${overdueInv} invoice${overdueInv !== 1 ? 's' : ''}` : 'None', color: overdueInv > 0 ? 'var(--danger)' : 'var(--good)' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: row.color, fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions({ navigate }) {
  const actions = [
    { icon: 'plus',      label: 'New Project',   to: '/dashboard/projects' },
    { icon: 'doc',       label: 'New Invoice',   to: '/dashboard/invoicing' },
    { icon: 'hash',      label: 'Create BQ',     to: '/dashboard/bq' },
    { icon: 'users',     label: 'Add Staff',     to: '/dashboard/hr' },
    { icon: 'shield',    label: 'Safety Report', to: '/dashboard/safety' },
    { icon: 'inventory', label: 'Adjust Stock',  to: '/dashboard/inventory' },
  ];
  return (
    <div className="card rise rise-6">
      <div className="card-head">
        <div className="card-title">Quick actions</div>
      </div>
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {actions.map(a => (
          <button key={a.to} className="btn ghost sm"
            onClick={() => navigate(a.to)}
            style={{ justifyContent: 'flex-start', fontSize: 12 }}>
            <Icon name={a.icon} size={13} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Fleet & Inventory Card ────────────────────────────────────────────────────
function FleetCard({ vehicles, expiringRT, expiringIns, lowStock, navigate }) {
  const rows = [
    { label: 'Vehicles tracked',  value: String(vehicles.length || 0), color: 'var(--text)' },
    { label: 'Road tax expiring', value: String(expiringRT.length),    color: expiringRT.length > 0 ? 'var(--warn)' : 'var(--good)' },
    { label: 'Insurance expiring',value: String(expiringIns.length),   color: expiringIns.length > 0 ? 'var(--warn)' : 'var(--good)' },
    { label: 'Low stock items',   value: String(lowStock.length),      color: lowStock.length > 0 ? 'var(--warn)' : 'var(--good)' },
  ];
  return (
    <div className="card rise rise-6">
      <div className="card-head">
        <div className="card-title">Fleet &amp; inventory</div>
        <button className="btn sm ghost" onClick={() => navigate('/dashboard/fleet')}>
          Fleet <Icon name="arrowR" size={12} />
        </button>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: row.color, fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
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

  // ── Derived metrics ──────────────────────────────────────────────────────
  const projects   = projData?.projects || projData || [];
  const invoices   = invData?.invoices  || invData  || [];
  const attendance = attData?.records   || attData  || [];
  const invItems   = invItemsData?.items || [];
  const vehicles   = fleetData?.vehicles || [];
  const claims     = claimsData?.claims  || claimsData || [];

  const active    = projects.filter(p => p.status === 'active').length;
  const delayed   = projects.filter(p => p.status === 'delayed').length;
  const totalCV   = projects.reduce((s, p) => s + parseFloat(p.contract_value || p.contract_sum || 0), 0);

  const outstanding      = invoices.filter(i => ['unpaid','overdue','partially_paid'].includes(i.status))
    .reduce((s, i) => s + (parseFloat(i.total || 0) - parseFloat(i.amount_paid || 0)), 0);
  const overdueInv       = invoices.filter(i => i.status === 'overdue').length;

  const todayStr         = today();
  const staffIn          = attendance.filter(a => a.clock_in?.startsWith(todayStr)).length;
  const staffOnSite      = attendance.filter(a => a.clock_in?.startsWith(todayStr) && !a.clock_out).length;

  const lowStock         = invItems.filter(i => parseFloat(i.quantity) <= parseFloat(i.reorder_level || 0));
  const expiringRT       = vehicles.filter(v => isExpiringSoon(v.road_tax_expiry || v.roadtax_expiry));
  const expiringIns      = vehicles.filter(v => isExpiringSoon(v.insurance_expiry));

  const claimsOutstanding = claims.filter(c => !['paid','rejected'].includes(c.status))
    .reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const totalBilled       = claims.reduce((s, c) => s + parseFloat(c.amount || 0), 0);

  // ── Alerts ───────────────────────────────────────────────────────────────
  const [alertItems, setAlertItems] = useState(null);
  const computedAlerts = [
    ...( delayed > 0 ? [{ type: 'danger', icon: 'building', title: `${delayed} project(s) behind schedule`, body: 'Review milestone plans and raise EOT where needed.', time: 'now' }] : [] ),
    ...( overdueInv > 0 ? [{ type: 'danger', icon: 'money', title: `${overdueInv} overdue invoice(s)`, body: `RM ${outstanding.toLocaleString('en-MY',{maximumFractionDigits:0})} outstanding — send reminders today.`, time: 'now', action: 'Send reminder' }] : [] ),
    ...( lowStock.length > 0 ? [{ type: 'warn', icon: 'inventory', title: `${lowStock.length} inventory item(s) below reorder level`, body: 'Check stock and raise purchase orders.', action: 'View inventory' }] : [] ),
    ...( expiringRT.length > 0 ? [{ type: 'warn', icon: 'truck', title: `${expiringRT.length} vehicle(s): road tax expiring`, body: 'Within 60 days — arrange renewal.', action: 'View fleet' }] : [] ),
    ...( expiringIns.length > 0 ? [{ type: 'warn', icon: 'shield', title: `${expiringIns.length} vehicle(s): insurance expiring`, body: 'Within 60 days — contact insurer.', action: 'View fleet' }] : [] ),
  ];
  if (!computedAlerts.length) {
    computedAlerts.push({ type: 'good', icon: 'check', title: 'All systems green', body: 'No active alerts — everything is running smoothly.' });
  }
  const alerts = alertItems ?? computedAlerts;
  const dismissAlert = (i) => setAlertItems(prev => (prev ?? computedAlerts).filter((_, idx) => idx !== i));

  // ── KPI drag/drop ────────────────────────────────────────────────────────
  const [kpiOrder, setKpiOrder] = useState(['revenue','portfolio','overdue','workforce']);
  const dragId = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const onDragStart = (id) => (e) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.setAttribute('data-dragging', 'true');
  };
  const onDragEnd = (e) => {
    e.currentTarget.removeAttribute('data-dragging');
    setDragOver(null);
  };
  const onDragOver = (id) => (e) => { e.preventDefault(); setDragOver(id); };
  const onDrop = (target) => (e) => {
    e.preventDefault();
    const src = dragId.current;
    if (!src || src === target) return;
    setKpiOrder(arr => {
      const next = arr.slice();
      const si = next.indexOf(src), ti = next.indexOf(target);
      next.splice(si, 1); next.splice(ti, 0, src);
      return next;
    });
    setDragOver(null);
  };

  const dragHandlers = (id) => ({
    draggable: true,
    onDragStart: onDragStart(id),
    onDragEnd,
    onDragOver: onDragOver(id),
    onDrop: onDrop(id),
    'data-dragover': dragOver === id ? 'true' : undefined,
  });

  const KPI_DEFS = {
    revenue: {
      label: 'Certified YTD',
      value: fmtRM(projects.reduce((s, p) => s + parseFloat(p.contract_value || p.contract_sum || 0) * (parseFloat(p.progress_pct ?? p.completion_pct ?? 0) / 100), 0)),
      delta: 8.4, deltaLabel: 'vs last month',
      spark: [4,6,5,7,8,7,9,11,10,12,13,14], sparkColor: 'var(--good)',
      loading: loadingProj,
    },
    portfolio: {
      label: 'Portfolio value',
      value: fmtRM(totalCV),
      delta: null, deltaLabel: `${projects.length} projects`,
      spark: null,
      loading: loadingProj,
    },
    overdue: {
      label: 'Overdue invoices',
      value: fmtRM(outstanding),
      delta: overdueInv > 0 ? null : -3.2, deltaLabel: overdueInv > 0 ? `${overdueInv} overdue` : 'vs last month',
      spark: [9,8,7,8,6,7,6,5,5,4,5,4], sparkColor: 'var(--danger)',
      loading: false,
    },
    workforce: {
      label: 'On-site today',
      value: staffIn > 0 ? String(staffIn) : '—',
      unit: undefined,
      delta: 2.1, deltaLabel: 'vs yesterday',
      spark: [60,58,59,61,62,60,59,61,63,61,60,staffIn || 60], sparkColor: 'var(--info)',
      loading: false,
    },
  };

  // ── Greeting ─────────────────────────────────────────────────────────────
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div className="page-head">
        <div>
          <h1>{greeting}, {firstName}</h1>
          <div className="sub">
            {active} active site{active !== 1 ? 's' : ''} · {alerts.filter(a => a.type !== 'good').length} alert{alerts.filter(a => a.type !== 'good').length !== 1 ? 's' : ''} need{alerts.filter(a => a.type !== 'good').length === 1 ? 's' : ''} attention
          </div>
        </div>
        <div className="actions">
          <button className="btn ghost"><Icon name="calendar" size={14} /> This month</button>
          <button className="btn"><Icon name="filter" size={14} /> Filter</button>
          <button className="btn"><Icon name="download" size={14} /> Export</button>
          <button className="btn primary" onClick={() => navigate('/dashboard/projects')}>
            <Icon name="plus" size={14} /> New project
          </button>
        </div>
      </div>

      <div className="page-body dash-page">

        {/* ── KPI STRIP (drag/drop reorderable) ────────── */}
        <div className="kpi-grid">
          {kpiOrder.map(id => {
            const k = KPI_DEFS[id];
            return <KpiTile key={id} id={id} {...k} dragHandlers={dragHandlers(id)} />;
          })}
        </div>

        {/* ── MAIN GRID — flexible main column + fixed side column ── */}
        <div className="dash-cols">

          {/* Main column: chart, projects, then a paired stat row */}
          <div className="dash-main">
            <CashflowCard />
            <ProjectsTable projects={projects} loading={loadingProj} navigate={navigate} />
            <div className="dash-duo">
              <FinanceCard
                claimsOutstanding={claimsOutstanding}
                totalBilled={totalBilled}
                overdueInv={overdueInv}
                outstanding={outstanding}
                navigate={navigate}
              />
              <FleetCard
                vehicles={vehicles}
                expiringRT={expiringRT}
                expiringIns={expiringIns}
                lowStock={lowStock}
                navigate={navigate}
              />
            </div>
          </div>

          {/* Side column: alerts, workforce, quick actions */}
          <div className="dash-side">
            <AlertsCard alerts={alerts} onDismiss={dismissAlert} />
            <UtilisationCard
              staffIn={staffIn || staffOnSite}
              staffTotal={invItems.length > 0 ? 884 : staffIn * 2 || 0}
            />
            <QuickActions navigate={navigate} />
          </div>

        </div>
      </div>
    </>
  );
}
