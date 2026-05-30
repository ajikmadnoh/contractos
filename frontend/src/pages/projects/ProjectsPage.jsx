import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Icon from '../../components/Icon';
import { Sparkline } from '../../components/Charts';

// ── constants ────────────────────────────────────────────────────────────────
const STATUS_PILL = {
  active: 'good', on_hold: 'warn', completed: 'info', cancelled: 'danger',
  delayed: 'danger', pending_customer: 'warn', pending_vendor: 'warn', pending_payment: 'warn',
  closing: 'good', live: 'accent',
};
const STATUS_LABEL = {
  active: 'Active', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
  delayed: 'Delayed', pending_customer: 'Pending Customer', pending_vendor: 'Pending Vendor',
  pending_payment: 'Pending Payment', closing: 'Closing Out', live: 'Live',
};
const PHASE_COLS = [
  { id: 'pre_construction', label: 'Pre-Construction', tone: 'info' },
  { id: 'substructure',     label: 'Substructure',     tone: 'warn' },
  { id: 'superstructure',   label: 'Superstructure',   tone: 'accent' },
  { id: 'mep_finishes',     label: 'MEP / Finishes',   tone: 'magenta' },
  { id: 'handover',         label: 'Snagging / Handover', tone: 'good' },
];

const fmt = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return `RM ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `RM ${(v / 1_000).toFixed(0)}K`;
  return `RM ${v.toFixed(0)}`;
};
const fmtNum = (n) => new Intl.NumberFormat().format(n || 0);

const TABS = [
  { id: 'programme',  label: 'Programme',      icon: 'calendar' },
  { id: 'portfolio',  label: 'Portfolio',       icon: 'building' },
  { id: 'kanban',     label: 'Kanban',          icon: 'flow' },
  { id: 'resources',  label: 'Resources',       icon: 'users' },
  { id: 'variations', label: 'Variations & EOT', icon: 'doc' },
  { id: 'risks',      label: 'Risks',           icon: 'shield' },
  { id: 'cashflow',   label: 'Cashflow',        icon: 'money' },
];

// ── main component ────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [tab, setTab] = useState('portfolio');
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();
  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const active   = projects.filter(p => ['active','live'].includes(p.status)).length;
  const closing  = projects.filter(p => p.status === 'closing').length;
  const delayed  = projects.filter(p => ['delayed','pending_customer','pending_vendor','pending_payment'].includes(p.status)).length;
  const totalVal = projects.reduce((s, p) => s + parseFloat(p.contract_sum || 0), 0);
  const totalCrew = projects.reduce((s, p) => s + (parseInt(p.crew_count) || 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">
            {active} active · {closing} closing · {projects.length} total · portfolio {fmt(totalVal)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px 4px 6px', border: '1px solid var(--border)',
            borderRadius: 999, background: 'var(--surface-2)', fontSize: 11.5
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)', boxShadow: '0 0 0 3px var(--good-soft)' }}/>
            <span style={{ color: 'var(--text-dim)' }}>Reporting week</span>
            <span style={{ fontWeight: 600 }}>
              {new Date().toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <button className="btn ghost sm"><Icon name="filter" size={14} /> Filter</button>
          <button className="btn ghost sm"><Icon name="download" size={14} /> Export</button>
          <button className="btn primary sm" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={14} /> New Project
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))',
        gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface)'
      }}>
        {[
          { label: 'Active Projects',   value: active,          color: 'var(--good)' },
          { label: 'Portfolio Value',   value: fmt(totalVal),   color: 'var(--accent)', mono: true },
          { label: 'Closing Out',       value: closing,         color: 'var(--info)' },
          { label: 'Delayed / Pending', value: delayed,         color: delayed > 0 ? 'var(--danger)' : 'var(--text-mute)' },
          { label: 'Total Projects',    value: projects.length, color: 'var(--text)' },
          { label: 'Crew Deployed',     value: fmtNum(totalCrew), color: 'var(--text-dim)', mono: true },
        ].map((k, i) => (
          <div key={i} style={{
            padding: '14px 20px',
            borderRight: i < 5 ? '1px solid var(--border)' : 'none'
          }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {k.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, fontFamily: k.mono ? 'JetBrains Mono, monospace' : undefined, marginTop: 2 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {tab === 'programme'  && <ProgrammeTab  projects={projects} isLoading={isLoading} onOpenProject={p => navigate(`/dashboard/projects/${p.id}`)} />}
        {tab === 'portfolio'  && <PortfolioTab  projects={projects} isLoading={isLoading} onOpenProject={p => navigate(`/dashboard/projects/${p.id}`)} />}
        {tab === 'kanban'     && <KanbanTab     projects={projects} onOpenProject={p => navigate(`/dashboard/projects/${p.id}`)} />}
        {tab === 'resources'  && <ResourcesTab  projects={projects} />}
        {tab === 'variations' && <VariationsTab projects={projects} />}
        {tab === 'risks'      && <RisksTab      projects={projects} />}
        {tab === 'cashflow'   && <CashflowTab   projects={projects} />}
      </div>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); refetch(); }}
        />
      )}
    </>
  );
}

// ── shared empty state ────────────────────────────────────────────────────────
function Empty({ icon = 'building', title, sub, action }) {
  return (
    <div className="empty" style={{ minHeight: 300 }}>
      <Icon name={icon} size={36} style={{ color: 'var(--border-strong)' }} />
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action}
    </div>
  );
}

// ── Programme / Gantt tab ─────────────────────────────────────────────────────
function ProgrammeTab({ projects, isLoading, onOpenProject }) {
  const [scope, setScope] = useState('portfolio');
  const [zoom, setZoom] = useState('quarter');
  const [showBaseline, setShowBaseline] = useState(true);

  const START_YEAR = 2024;
  const END_YEAR   = 2028;
  const MONTH_W    = zoom === 'month' ? 52 : 26;
  const LABEL_W    = 260;
  const totalMonths = (END_YEAR - START_YEAR) * 12;
  const todayMs = Date.now();

  function monthPos(dateStr) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    return (d.getFullYear() - START_YEAR) * 12 + d.getMonth() + d.getDate() / 30;
  }

  const todayPos = monthPos(new Date().toISOString().slice(0, 10)) * MONTH_W;

  const MMM = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  if (isLoading) return <div style={{ padding: 32, color: 'var(--text-mute)' }}>Loading…</div>;
  if (!projects.length) return <Empty icon="calendar" title="No projects" sub="Create a project to see the programme." />;

  return (
    <div className="card">
      <div className="card-head">
        <h3>Programme — Portfolio view</h3>
        <span className="page-sub">Click a row to drill into project detail</span>
        <div style={{ flex: 1 }} />
        <div className="seg-toggle">
          <button aria-pressed={zoom === 'quarter'} onClick={() => setZoom('quarter')}>Quarter</button>
          <button aria-pressed={zoom === 'month'} onClick={() => setZoom('month')}>Month</button>
        </div>
        <button
          className={`btn sm ghost${showBaseline ? ' active' : ''}`}
          onClick={() => setShowBaseline(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span style={{ width: 10, height: 4, border: '1.5px dashed var(--text-mute)', borderRadius: 2 }} />
          Baseline
        </button>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface-2)',
        fontSize: 11, color: 'var(--text-dim)'
      }}>
        {[
          { swatch: <span style={{ width: 14, height: 8, background: 'var(--accent)', borderRadius: 2 }} />, label: 'On-track' },
          { swatch: <span style={{ width: 14, height: 8, background: 'var(--warn)', borderRadius: 2 }} />, label: 'At risk' },
          { swatch: <span style={{ width: 14, height: 8, background: 'var(--good)', borderRadius: 2 }} />, label: 'Complete' },
          { swatch: <span style={{ width: 10, height: 10, background: 'var(--magenta)', transform: 'rotate(45deg)', display: 'inline-block' }} />, label: 'Milestone' },
          { swatch: <span style={{ width: 2, height: 12, background: 'var(--accent)', display: 'inline-block' }} />, label: 'Today' },
        ].map((l, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{l.swatch} {l.label}</span>
        ))}
      </div>

      <div style={{ overflowX: 'auto', position: 'relative' }}>
        <div style={{ minWidth: LABEL_W + totalMonths * MONTH_W }}>
          {/* Timeline header */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 3, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: LABEL_W, flexShrink: 0, padding: '10px 16px', borderRight: '1px solid var(--border)', fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Project
            </div>
            <div style={{ display: 'flex', position: 'relative', minWidth: totalMonths * MONTH_W }}>
              {Array.from({ length: END_YEAR - START_YEAR }, (_, yi) => (
                <div key={yi} style={{ width: 12 * MONTH_W, borderRight: '1px solid var(--border)' }}>
                  <div style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{START_YEAR + yi}</div>
                  {zoom === 'quarter' ? (
                    <div style={{ display: 'flex' }}>
                      {['Q1','Q2','Q3','Q4'].map((q, qi) => (
                        <div key={q} style={{ width: 3 * MONTH_W, padding: '3px 6px', fontSize: 9.5, color: 'var(--text-mute)', borderRight: qi < 3 ? '1px solid var(--border)' : 'none' }}>{q}</div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex' }}>
                      {MMM.map((m, mi) => (
                        <div key={mi} style={{ width: MONTH_W, padding: '3px 0', fontSize: 9, color: 'var(--text-mute)', textAlign: 'center', borderRight: mi < 11 ? '1px solid var(--border)' : 'none' }}>{m}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* today line */}
              <div style={{ position: 'absolute', left: todayPos, top: 0, bottom: -10000, width: 2, background: 'var(--accent)', opacity: 0.8, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 4, left: 4, padding: '1px 5px', borderRadius: 3, background: 'var(--accent)', color: 'white', fontSize: 9, fontWeight: 700 }}>NOW</div>
              </div>
            </div>
          </div>

          {/* Project rows */}
          {projects.map((p, i) => {
            const ms = monthPos(p.start_date);
            const me = monthPos(p.end_date);
            const len = Math.max(0.5, me - ms);
            const pct = parseFloat(p.progress_pct || p.completion_pct || 0);
            const actualLen = Math.max(0.5, len * (pct / 100));
            const status = p.status || 'active';
            const isComplete = ['completed','closing'].includes(status);
            const isAtRisk   = ['delayed','pending_customer','pending_vendor'].includes(status);
            const barColor   = isComplete ? 'var(--good)' : isAtRisk ? 'var(--warn)' : 'var(--accent)';
            const bsStart = ms - 0.5, bsEnd = me - 1;
            const ROW_H = 60;
            return (
              <div key={p.id} onClick={() => onOpenProject(p)}
                style={{
                  display: 'flex', borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                  cursor: 'pointer', height: ROW_H
                }}>
                <div style={{ width: LABEL_W, flexShrink: 0, padding: '8px 12px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', fontWeight: 700 }}>
                      {p.project_number || p.project_code || '—'}
                    </span>
                    {isAtRisk && <span className="pill warn" style={{ padding: '0 5px', fontSize: 9.5 }}>at risk</span>}
                    {isComplete && <span className="pill good" style={{ padding: '0 5px', fontSize: 9.5 }}>closing</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: LABEL_W - 28 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{p.pm_name || '—'}</div>
                </div>
                <div style={{ position: 'relative', flex: 1, height: ROW_H }}>
                  {showBaseline && ms > 0 && (
                    <div style={{
                      position: 'absolute', left: bsStart * MONTH_W + 3, top: 10, height: 6,
                      width: Math.max(8, (bsEnd - bsStart) * MONTH_W - 6),
                      borderRadius: 3, border: '1.5px dashed var(--text-mute)', background: 'transparent'
                    }} />
                  )}
                  {ms > 0 && (
                    <div style={{
                      position: 'absolute', left: ms * MONTH_W + 3, top: 20, height: 12,
                      width: Math.max(8, len * MONTH_W - 6), borderRadius: 3,
                      background: 'var(--bg-2)', border: '1px solid var(--border-strong)'
                    }} />
                  )}
                  {ms > 0 && (
                    <div style={{
                      position: 'absolute', left: ms * MONTH_W + 3, top: 34, height: 12,
                      width: Math.max(8, actualLen * MONTH_W - 6), borderRadius: 3,
                      background: barColor, boxShadow: '0 1px 2px rgba(0,0,0,.1)'
                    }}>
                      {actualLen * MONTH_W > 30 && (
                        <div style={{ position: 'absolute', inset: 0, padding: '0 6px', display: 'flex', alignItems: 'center', fontSize: 9.5, color: 'white', fontWeight: 700 }}>
                          {pct}%
                        </div>
                      )}
                    </div>
                  )}
                  {me > 0 && (
                    <div title={`Handover ${p.end_date}`} style={{
                      position: 'absolute', left: me * MONTH_W - 5, top: 28,
                      width: 10, height: 10, background: 'var(--magenta)',
                      transform: 'rotate(45deg)', boxShadow: '0 0 0 2px var(--surface)'
                    }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Portfolio tab ─────────────────────────────────────────────────────────────
function PortfolioTab({ projects, isLoading, onOpenProject }) {
  const [sort, setSort] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() => {
    let rows = [...projects];
    if (filterStatus === 'active')   rows = rows.filter(p => ['active','live'].includes(p.status));
    if (filterStatus === 'at_risk')  rows = rows.filter(p => ['delayed','pending_customer','pending_vendor','pending_payment'].includes(p.status));
    if (filterStatus === 'closing')  rows = rows.filter(p => p.status === 'closing');
    if (sort === 'name')     rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'value')    rows.sort((a, b) => parseFloat(b.contract_sum) - parseFloat(a.contract_sum));
    if (sort === 'progress') rows.sort((a, b) => parseFloat(b.progress_pct || 0) - parseFloat(a.progress_pct || 0));
    return rows;
  }, [projects, sort, filterStatus]);

  const totals = useMemo(() => ({
    contract: projects.reduce((s, p) => s + parseFloat(p.contract_sum || 0), 0),
    openTasks: projects.reduce((s, p) => s + parseInt(p.open_tasks || 0), 0),
    crew: projects.reduce((s, p) => s + parseInt(p.crew_count || 0), 0),
  }), [projects]);

  if (isLoading) return <div style={{ padding: 32, color: 'var(--text-mute)' }}>Loading…</div>;
  if (!projects.length) return <Empty icon="building" title="No projects yet" sub="Create your first project to get started." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
      {/* KPI rail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 'var(--sp-sm)' }}>
        {[
          { label: 'Active contract value',   value: fmt(totals.contract),         foot: `${projects.length} projects live` },
          { label: 'Active projects',         value: projects.filter(p => ['active','live'].includes(p.status)).length, foot: 'in execution' },
          { label: 'Pending payment',         value: projects.filter(p => p.status === 'pending_payment').length, foot: 'awaiting settlement', tone: 'warn' },
          { label: 'Delayed',                 value: projects.filter(p => p.status === 'delayed').length, foot: 'behind schedule', tone: 'danger' },
          { label: 'Open tasks',              value: totals.openTasks,             foot: 'across all projects', tone: 'info' },
          { label: 'Crew deployed',           value: fmtNum(totals.crew),          foot: 'on site today' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2, fontFamily: typeof k.value === 'string' && k.value.startsWith('RM') ? 'JetBrains Mono, monospace' : undefined }}>{k.value}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Portfolio</h3>
          <span className="page-sub">{filtered.length} projects</span>
          <div style={{ flex: 1 }} />
          <div className="seg-toggle">
            <button aria-pressed={filterStatus === 'all'}      onClick={() => setFilterStatus('all')}>All ({projects.length})</button>
            <button aria-pressed={filterStatus === 'active'}   onClick={() => setFilterStatus('active')}>Active</button>
            <button aria-pressed={filterStatus === 'at_risk'}  onClick={() => setFilterStatus('at_risk')}>At Risk</button>
            <button aria-pressed={filterStatus === 'closing'}  onClick={() => setFilterStatus('closing')}>Closing</button>
          </div>
          <select className="input" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto', minWidth: 140, padding: '4px 8px', height: 28, fontSize: 12 }}>
            <option value="name">Sort: Name</option>
            <option value="value">Sort: Contract Value</option>
            <option value="progress">Sort: Progress</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>Project</th>
                <th>PM / Phase</th>
                <th>Status</th>
                <th className="tbl-mono">Contract Value</th>
                <th>Progress</th>
                <th className="tbl-mono">Open Tasks</th>
                <th className="tbl-mono">Retention</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const pct = parseFloat(p.progress_pct || p.completion_pct || 0);
                const pill = STATUS_PILL[p.status] || 'muted';
                const retention = parseFloat(p.contract_sum || 0) * (parseFloat(p.retention_percentage || 10) / 100);
                return (
                  <tr key={p.id} onClick={() => onOpenProject(p)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                          background: 'var(--accent-soft)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9.5, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace'
                        }}>
                          {(p.project_number || 'PRJ').slice(-4)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="pin" size={10} />
                            {p.site_address || p.client_name || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{p.pm_name || '—'}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{p.current_phase || '—'}</div>
                    </td>
                    <td><span className={`pill ${pill}`}>{STATUS_LABEL[p.status] || p.status || '—'}</span></td>
                    <td className="tbl-mono">{fmt(p.contract_sum)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: pct >= 80 ? 'var(--good)' : pct >= 40 ? 'var(--accent)' : 'var(--warn)',
                            borderRadius: 99
                          }} />
                        </div>
                        <span className="tbl-mono" style={{ minWidth: 32, color: 'var(--text-dim)', fontSize: 11 }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="tbl-mono" style={{ color: parseInt(p.open_tasks) > 0 ? 'var(--warn)' : 'var(--text-dim)' }}>
                      {p.open_tasks || 0}
                    </td>
                    <td className="tbl-mono" style={{ color: 'var(--text-dim)' }}>{fmt(retention)}</td>
                    <td><button className="btn sm ghost"><Icon name="chevR" size={12} /></button></td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--surface-2)', fontWeight: 600 }}>
                <td colSpan={3} style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Portfolio Total</td>
                <td className="tbl-mono">{fmt(totals.contract)}</td>
                <td colSpan={2} style={{ color: 'var(--text-dim)', fontSize: 11 }}>{totals.openTasks} open tasks</td>
                <td className="tbl-mono" style={{ color: 'var(--text-dim)' }}>
                  {fmt(projects.reduce((s, p) => s + parseFloat(p.contract_sum || 0) * parseFloat(p.retention_percentage || 10) / 100, 0))}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Kanban tab ────────────────────────────────────────────────────────────────
function KanbanTab({ projects, onOpenProject }) {
  const dragRef = useRef(null);
  const [over, setOver] = useState(null);
  const [cols, setCols] = useState(() => {
    const m = {};
    PHASE_COLS.forEach(c => { m[c.id] = []; });
    projects.forEach(p => {
      const col = p.current_phase || 'pre_construction';
      const key = PHASE_COLS.find(c => c.id === col)?.id || 'pre_construction';
      if (!m[key]) m[key] = [];
      m[key].push(p.id);
    });
    return m;
  });

  const onDragStart = (id) => (e) => { dragRef.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const onDrop = (colId) => (e) => {
    e.preventDefault();
    const id = dragRef.current;
    if (!id) return;
    setCols(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { next[k] = prev[k].filter(x => x !== id); });
      next[colId] = [...(next[colId] || []), id];
      return next;
    });
    setOver(null);
  };

  if (!projects.length) return <Empty icon="flow" title="No projects" sub="Projects will appear here once created." />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PHASE_COLS.length}, minmax(0,1fr))`, gap: 12 }}>
      {PHASE_COLS.map(col => {
        const ids = cols[col.id] || [];
        const colProjects = ids.map(id => projects.find(p => p.id === id)).filter(Boolean);
        return (
          <div key={col.id}
            onDragOver={e => { e.preventDefault(); setOver(col.id); }}
            onDragLeave={() => setOver(null)}
            onDrop={onDrop(col.id)}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 10,
              display: 'flex', flexDirection: 'column', gap: 8, minHeight: 300,
              boxShadow: over === col.id ? `0 0 0 2px var(--accent)` : 'none',
              transition: 'box-shadow .12s'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: `var(--${col.tone})` }} />
              <span style={{ fontSize: 11.5, fontWeight: 600 }}>{col.label}</span>
              <span className="pill outline" style={{ marginLeft: 'auto', padding: '0 7px' }}>{colProjects.length}</span>
            </div>
            {colProjects.length === 0 && (
              <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center', color: 'var(--text-mute)', fontSize: 11 }}>
                No projects
              </div>
            )}
            {colProjects.map(p => {
              const pct = parseFloat(p.progress_pct || 0);
              return (
                <div key={p.id}
                  draggable
                  onDragStart={onDragStart(p.id)}
                  onClick={() => onOpenProject(p)}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 12, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="drag" size={12} style={{ color: 'var(--text-mute)' }} />
                    <span style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {p.project_number || '—'}
                    </span>
                    <span className={`pill ${STATUS_PILL[p.status] || 'muted'}`} style={{ marginLeft: 'auto', padding: '0 6px', fontSize: 9.5 }}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.client_name || p.site_address || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `var(--accent)` }} />
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{pct}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--text-dim)' }}>
                    <Icon name="user" size={10} /> {p.pm_name || '—'}
                    <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(p.contract_sum)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Resources tab ─────────────────────────────────────────────────────────────
function ResourcesTab({ projects }) {
  const [view, setView] = useState('crew');
  const WEEKS = ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'];

  const syntheticCrew = projects.slice(0, 6).map(p => {
    const base = parseInt(p.crew_count) || Math.floor(Math.random() * 80 + 20);
    return {
      project: p.project_number || p.name.slice(0, 8),
      trade: 'All trades',
      row: WEEKS.map((_, i) => Math.max(0, Math.round(base * (1 + (Math.sin(i * 0.8 + p.id?.charCodeAt(0)) * 0.2)))))
    };
  });

  const maxCrew = Math.max(...syntheticCrew.flatMap(c => c.row), 1);

  if (!projects.length) return <Empty icon="users" title="No resources" sub="Resources will appear here once projects are created." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-head">
          <h3>Resources</h3>
          <span className="page-sub">Crew deployment · next 12 weeks</span>
          <div style={{ flex: 1 }} />
          <div className="seg-toggle">
            <button aria-pressed={view === 'crew'}  onClick={() => setView('crew')}>Crew heatmap</button>
            <button aria-pressed={view === 'plant'} onClick={() => setView('plant')}>Plant register</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto', padding: '0 0 8px' }}>
          {view === 'crew' && (
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 200 + WEEKS.length * 60 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 16px', position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Project</th>
                  {WEEKS.map(w => (
                    <th key={w} style={{ width: 60, padding: '6px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)', textAlign: 'center' }}>{w}</th>
                  ))}
                  <th style={{ width: 60, padding: '6px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)', textAlign: 'center' }}>Peak</th>
                </tr>
              </thead>
              <tbody>
                {syntheticCrew.map((c, ri) => {
                  const peak = Math.max(...c.row);
                  return (
                    <tr key={ri}>
                      <td style={{ padding: '8px 16px', position: 'sticky', left: 0, background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)', fontWeight: 600, fontSize: 12, borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {c.project}
                      </td>
                      {c.row.map((v, k) => {
                        const intensity = v / maxCrew;
                        return (
                          <td key={k} style={{ padding: 3, borderTop: '1px solid var(--border)', background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                            <div title={`${v} workers`} style={{
                              height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                              background: `rgba(31, 79, 216, ${0.1 + intensity * 0.8})`,
                              color: intensity > 0.5 ? 'white' : 'var(--text)'
                            }}>{v || ''}</div>
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', borderTop: '1px solid var(--border)' }}>
                        {peak}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {view === 'plant' && (
            <div style={{ padding: 16, color: 'var(--text-mute)', textAlign: 'center', fontSize: 13 }}>
              <Icon name="tool" size={32} style={{ marginBottom: 8 }} />
              <div>Plant register will pull from Fleet Management module.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Link equipment to projects in Fleet → assign to site.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Variations & EOT tab ──────────────────────────────────────────────────────
function VariationsTab({ projects }) {
  const { data: allCOs = [] } = useQuery({
    queryKey: ['portfolio-change-orders'],
    queryFn: () => api.get('/projects/portfolio/change-orders').then(r => r.data).catch(() => []),
  });
  const [filter, setFilter] = useState('all');

  const filtered = allCOs.filter(co => {
    if (filter === 'open')     return ['pending_approval', 'submitted', 'negotiating'].includes(co.status);
    if (filter === 'approved') return co.status === 'approved';
    if (filter === 'rejected') return co.status === 'rejected';
    return true;
  });

  const approved = allCOs.filter(co => co.status === 'approved');
  const open     = allCOs.filter(co => ['pending_approval','submitted','negotiating'].includes(co.status));
  const approvedVal = approved.reduce((s, co) => s + parseFloat(co.cost_change || 0), 0);
  const openVal     = open.reduce((s, co) => s + parseFloat(co.cost_change || 0), 0);

  if (!projects.length) return <Empty icon="doc" title="No variations" sub="Variations & EOT events will appear here." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Total change orders', value: allCOs.length, foot: `across ${projects.length} projects` },
          { label: 'Approved Σ', value: fmt(approvedVal), foot: `${approved.length} approved`, tone: 'good' },
          { label: 'Open exposure', value: fmt(openVal), foot: `${open.length} in flight`, tone: 'warn' },
          { label: 'Rejected', value: allCOs.filter(co => co.status === 'rejected').length, foot: 'closed out', tone: 'danger' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2 }}>{k.value}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Change Order / Variation register</h3>
          <span className="page-sub">{filtered.length} records</span>
          <div style={{ flex: 1 }} />
          <div className="seg-toggle">
            <button aria-pressed={filter === 'all'}      onClick={() => setFilter('all')}>All ({allCOs.length})</button>
            <button aria-pressed={filter === 'open'}     onClick={() => setFilter('open')}>Open ({open.length})</button>
            <button aria-pressed={filter === 'approved'} onClick={() => setFilter('approved')}>Approved</button>
            <button aria-pressed={filter === 'rejected'} onClick={() => setFilter('rejected')}>Rejected</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-mute)', fontSize: 13 }}>
            {allCOs.length === 0 ? 'No change orders yet. Raise a CO from inside a project.' : 'No records match this filter.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>CO #</th><th>Project</th><th>Title</th><th>Origin</th>
                  <th>Status</th><th className="tbl-mono">Cost Change</th>
                  <th className="tbl-mono">Time (days)</th><th className="tbl-mono">Raised</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(co => (
                  <tr key={co.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{co.co_number}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{co.project_name}</td>
                    <td>{co.title}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{co.origin || '—'}</td>
                    <td>
                      <span className={`pill ${
                        co.status === 'approved' ? 'good' :
                        co.status === 'rejected' ? 'danger' :
                        co.status === 'pending_approval' ? 'warn' : 'info'
                      }`}>
                        {co.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="tbl-mono" style={{ color: parseFloat(co.cost_change) >= 0 ? 'var(--good)' : 'var(--danger)', fontWeight: 600 }}>
                      {parseFloat(co.cost_change) >= 0 ? '+' : ''}{fmt(co.cost_change)}
                    </td>
                    <td className="tbl-mono">{co.time_change ? `${co.time_change}d` : '—'}</td>
                    <td className="tbl-mono" style={{ color: 'var(--text-dim)' }}>{co.created_at?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Risks tab ─────────────────────────────────────────────────────────────────
function RisksTab({ projects }) {
  const { data: allRisks = [] } = useQuery({
    queryKey: ['portfolio-risks'],
    queryFn: () => api.get('/projects/portfolio/risks').then(r => r.data).catch(() => []),
  });

  const matrix = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  allRisks.forEach(r => {
    const l = Math.min(5, Math.max(1, r.likelihood)) - 1;
    const imp = Math.min(5, Math.max(1, r.impact));
    matrix[5 - imp][l].push(r);
  });

  const cellColor = (l, i) => {
    const s = l * i;
    if (s >= 16) return 'var(--danger-soft)';
    if (s >= 9)  return 'var(--warn-soft)';
    if (s >= 4)  return 'var(--info-soft)';
    return 'var(--surface-2)';
  };

  if (!projects.length) return <Empty icon="shield" title="No risks" sub="Project risks will appear here once registered." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Total risks',   value: allRisks.length,                                                    foot: 'on register' },
          { label: 'High severity', value: allRisks.filter(r => r.likelihood * r.impact >= 16).length,         foot: 'L × I ≥ 16', tone: 'danger' },
          { label: 'Medium',        value: allRisks.filter(r => { const s = r.likelihood * r.impact; return s >= 9 && s < 16; }).length, foot: 'L × I 9–15', tone: 'warn' },
          { label: 'Trending up',   value: allRisks.filter(r => r.trend === 'up').length,                      foot: 'worsening', tone: 'warn' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2 }}>{k.value}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 16 }}>
        <div className="card">
          <div className="card-head"><h3>Likelihood × Impact</h3><span className="page-sub">5×5 register</span></div>
          <div style={{ padding: 16 }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, color: 'var(--text-mute)', textAlign: 'right', paddingRight: 8, width: 32 }}>I↑ L→</th>
                  {[1,2,3,4,5].map(l => <th key={l} style={{ fontSize: 10.5, color: 'var(--text-dim)', textAlign: 'center', width: '20%' }}>L{l}</th>)}
                </tr>
              </thead>
              <tbody>
                {[5,4,3,2,1].map((imp, ri) => (
                  <tr key={imp}>
                    <td style={{ fontSize: 10.5, color: 'var(--text-dim)', textAlign: 'right', paddingRight: 8, fontWeight: 600 }}>I{imp}</td>
                    {[1,2,3,4,5].map(l => {
                      const cell = matrix[5 - imp][l - 1];
                      return (
                        <td key={l} style={{ padding: 4 }}>
                          <div style={{
                            minHeight: 36, borderRadius: 6, background: cellColor(l, imp),
                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 3, flexWrap: 'wrap', padding: 4
                          }}>
                            {cell.map((r, ri) => (
                              <span key={ri} title={r.title} style={{
                                width: 9, height: 9, borderRadius: '50%',
                                background: l * imp >= 16 ? 'var(--danger)' : l * imp >= 9 ? 'var(--warn)' : 'var(--info)',
                                boxShadow: '0 0 0 1.5px var(--surface)'
                              }} />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10.5, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              {[
                { color: 'var(--danger-soft)', label: 'High (≥16)' },
                { color: 'var(--warn-soft)',   label: 'Medium (9-15)' },
                { color: 'var(--info-soft)',   label: 'Low (4-8)' },
              ].map(l => (
                <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, border: '1px solid var(--border)' }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Risk register</h3><span className="page-sub">{allRisks.length} total · sorted by severity</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Risk</th><th>Project</th><th>Category</th><th>Severity</th><th>Trend</th><th>Owner</th></tr>
              </thead>
              <tbody>
                {allRisks.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-mute)', padding: 24 }}>No risks registered. Add risks from within each project.</td></tr>
                ) : allRisks.sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact)).map(r => {
                  const s = r.likelihood * r.impact;
                  const tone = s >= 16 ? 'danger' : s >= 9 ? 'warn' : 'info';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{r.title}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{r.project_name}</td>
                      <td><span className="pill outline" style={{ padding: '0 7px' }}>{r.category}</span></td>
                      <td><span className={`pill ${tone}`} style={{ padding: '0 7px' }}>L{r.likelihood}·I{r.impact}</span></td>
                      <td>
                        <Icon
                          name={r.trend === 'up' ? 'arrowU' : r.trend === 'down' ? 'arrowD' : 'arrowR'}
                          size={13}
                          style={{ color: r.trend === 'up' ? 'var(--danger)' : r.trend === 'down' ? 'var(--good)' : 'var(--text-mute)' }}
                        />
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{r.owner || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cashflow tab ──────────────────────────────────────────────────────────────
function CashflowTab({ projects }) {
  const WEEKS = Array.from({ length: 13 }, (_, i) => `W${i + 1}`);
  const totalContract = projects.reduce((s, p) => s + parseFloat(p.contract_sum || 0), 0);

  const syntheticData = WEEKS.map((_, i) => ({
    week: WEEKS[i],
    certified: Math.round(totalContract * 0.08 * (0.8 + Math.sin(i * 0.7) * 0.3)),
    invoiced:  Math.round(totalContract * 0.08 * (0.75 + Math.sin(i * 0.7) * 0.25)),
    received:  Math.round(totalContract * 0.08 * (0.6 + Math.sin(i * 0.7) * 0.2)),
  }));

  const maxVal = Math.max(...syntheticData.flatMap(d => [d.certified, d.invoiced, d.received]), 1);
  const chartH = 180, chartW = 560, padL = 60, padB = 24, padT = 12, padR = 12;
  const barW = Math.floor((chartW - padL - padR) / WEEKS.length / 3 - 2);

  if (!projects.length) return <Empty icon="money" title="No cashflow data" sub="Cashflow will populate once projects are created." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Certified — this month', value: fmt(totalContract * 0.08), foot: 'forecast' },
          { label: 'Invoiced — this month',  value: fmt(totalContract * 0.074), foot: '92% of certified' },
          { label: 'Cash received',          value: fmt(totalContract * 0.06), foot: 'DSO ~45d', tone: 'info' },
          { label: 'Retention held',         value: fmt(projects.reduce((s, p) => s + parseFloat(p.contract_sum || 0) * parseFloat(p.retention_percentage || 10) / 100, 0)), foot: '5–10% avg', tone: 'warn' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{k.value}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Cashflow — 13-week rolling</h3>
          <span className="page-sub">Certified vs invoiced vs received · all projects</span>
          <div style={{ flex: 1 }} />
          {[
            { color: 'var(--accent)', label: 'Certified' },
            { color: 'var(--info)',   label: 'Invoiced' },
            { color: 'var(--good)',   label: 'Received' },
          ].map(l => (
            <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} /> {l.label}
            </span>
          ))}
        </div>
        <div style={{ padding: '8px 16px 16px' }}>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={chartH} preserveAspectRatio="xMidYMid meet">
            {/* y-axis gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
              <g key={v}>
                <line x1={padL} x2={chartW - padR} y1={padT + (1 - v) * (chartH - padT - padB)} y2={padT + (1 - v) * (chartH - padT - padB)} stroke="var(--border)" strokeDasharray={v === 0 ? '' : '2 4'} />
                <text x={padL - 6} y={padT + (1 - v) * (chartH - padT - padB) + 3} fontSize="9" fill="var(--text-mute)" textAnchor="end" fontFamily="JetBrains Mono">
                  {fmt(maxVal * v)}
                </text>
              </g>
            ))}
            {/* bars */}
            {syntheticData.map((d, i) => {
              const groupW = (chartW - padL - padR) / WEEKS.length;
              const x0 = padL + i * groupW + 3;
              const colors = ['var(--accent)', 'var(--info)', 'var(--good)'];
              return [d.certified, d.invoiced, d.received].map((val, j) => {
                const bH = Math.max(2, (val / maxVal) * (chartH - padT - padB));
                return (
                  <rect key={j} x={x0 + j * (barW + 1)} y={chartH - padB - bH}
                    width={barW} height={bH} rx="2" fill={colors[j]} opacity={0.8} />
                );
              });
            })}
            {/* x labels */}
            {syntheticData.map((d, i) => {
              const groupW = (chartW - padL - padR) / WEEKS.length;
              return (
                <text key={i} x={padL + i * groupW + groupW / 2} y={chartH - 6} fontSize="9" fill="var(--text-mute)" textAnchor="middle">{d.week}</text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Per-project breakdown */}
      <div className="card">
        <div className="card-head"><h3>Cashflow by project</h3><span className="page-sub">Contract vs progress · all projects</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Project</th><th>Status</th>
                <th className="tbl-mono">Contract</th>
                <th className="tbl-mono">Certified</th>
                <th className="tbl-mono">Retention</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const contract = parseFloat(p.contract_sum || 0);
                const pct = parseFloat(p.progress_pct || 0);
                const certified = contract * (pct / 100);
                const retention = certified * (parseFloat(p.retention_percentage || 10) / 100);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.project_number || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.name}</div>
                    </td>
                    <td><span className={`pill ${STATUS_PILL[p.status] || 'muted'}`}>{STATUS_LABEL[p.status] || p.status}</span></td>
                    <td className="tbl-mono">{fmt(contract)}</td>
                    <td className="tbl-mono">{fmt(certified)}</td>
                    <td className="tbl-mono" style={{ color: 'var(--warn)', fontWeight: 600 }}>{fmt(retention)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', minWidth: 80 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', minWidth: 30 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── New Project Modal ─────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', contractSum: '', startDate: '', endDate: '',
    siteAddress: '', retentionPercentage: '10', projectType: 'building',
    projectPhase: 'pre_construction', clientId: ''
  });

  const { data: clientProfiles = [] } = useQuery({
    queryKey: ['profiles-clients'],
    queryFn: () => api.get('/profiles').then(r =>
      (r.data || []).filter(p => ['client', 'main_contractor'].includes(p.profile_type))
    ),
    staleTime: 5 * 60_000,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/projects', {
        name: form.name, description: form.description,
        contractSum: form.contractSum, startDate: form.startDate,
        endDate: form.endDate, siteAddress: form.siteAddress,
        retentionPercentage: form.retentionPercentage,
        projectType: form.projectType, projectPhase: form.projectPhase,
        clientId: form.clientId || undefined,
      });
      onCreated();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create project.');
    } finally { setSaving(false); }
  };

  const f = (key) => ({
    value: form[key],
    onChange: e => setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">New Project</span>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="label">Project Name *</label>
              <input className="input" placeholder="e.g. Pavilion Damansara Heights — Tower 3" {...f('name')} required />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea rows={2} className="input" style={{ resize: 'vertical' }} placeholder="Brief project description…" {...f('description')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Project Type</label>
                <select className="input" {...f('projectType')}>
                  <option value="building">Building</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="industrial">Industrial</option>
                  <option value="renovation">Renovation</option>
                  <option value="mep">MEP Works</option>
                  <option value="road">Road / Pavement</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Current Phase</label>
                <select className="input" {...f('projectPhase')}>
                  {PHASE_COLS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Client / Main Contractor</label>
                <select className="input" value={form.clientId} onChange={e => setForm(prev => ({ ...prev, clientId: e.target.value }))}>
                  <option value="">— No client linked —</option>
                  {clientProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Site Address</label>
                <input className="input" placeholder="e.g. Bukit Damansara, KL" {...f('siteAddress')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Contract Sum (RM)</label>
                <input type="number" className="input" placeholder="e.g. 5000000" {...f('contractSum')} />
              </div>
              <div className="form-group">
                <label className="label">Retention %</label>
                <input type="number" className="input" placeholder="10" min="0" max="20" {...f('retentionPercentage')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Start Date</label>
                <input type="date" className="input" {...f('startDate')} />
              </div>
              <div className="form-group">
                <label className="label">End Date</label>
                <input type="date" className="input" {...f('endDate')} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
