import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Icon from '../../components/Icon';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return `RM ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `RM ${(v / 1_000).toFixed(0)}K`;
  return `RM ${v.toFixed(0)}`;
};
const daysFrom = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Math.round((new Date(dateStr) - Date.now()) / 86400000);
  if (diff === 0) return 'today';
  if (diff > 0)  return `in ${diff}d`;
  return `${Math.abs(diff)}d ago`;
};

const STATUS_PILL = {
  active: 'good', on_hold: 'warn', completed: 'info', cancelled: 'danger',
  delayed: 'danger', pending_customer: 'warn', pending_vendor: 'warn',
  pending_payment: 'warn', closing: 'good', live: 'accent',
};
const STATUS_LABEL = {
  active: 'Active', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
  delayed: 'Delayed', pending_customer: 'Pending Customer', pending_vendor: 'Pending Vendor',
  pending_payment: 'Pending Payment', closing: 'Closing Out', live: 'Live',
};

const DETAIL_TABS = [
  { id: 'overview',    label: 'Overview',    icon: 'dashboard' },
  { id: 'programme',   label: 'Programme',   icon: 'calendar' },
  { id: 'commercial',  label: 'Commercial',  icon: 'money' },
  { id: 'tracking',    label: 'Scope & Diary', icon: 'trend' },
  { id: 'quality',     label: 'Quality',     icon: 'shield' },
  { id: 'team',        label: 'Team & Site', icon: 'users' },
  { id: 'documents',   label: 'Documents',   icon: 'doc' },
];

// ── main ──────────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  });
  const { data: rfis = [] } = useQuery({
    queryKey: ['project-rfis', id],
    queryFn: () => api.get(`/projects/${id}/rfis`).then(r => r.data).catch(() => []),
  });
  const { data: submittals = [] } = useQuery({
    queryKey: ['project-submittals', id],
    queryFn: () => api.get(`/projects/${id}/submittals`).then(r => r.data).catch(() => []),
  });
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['project-change-orders', id],
    queryFn: () => api.get(`/projects/${id}/change-orders`).then(r => r.data).catch(() => []),
  });
  const { data: risks = [] } = useQuery({
    queryKey: ['project-risks', id],
    queryFn: () => api.get(`/projects/${id}/risks`).then(r => r.data).catch(() => []),
  });

  if (isLoading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-mute)' }}>
      <Icon name="refresh" size={24} style={{ marginBottom: 8 }} />
      <div>Loading project…</div>
    </div>
  );
  if (error || !project) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ color: 'var(--danger)', marginBottom: 8 }}>Project not found.</div>
      <button className="btn ghost" onClick={() => navigate('/dashboard/projects')}>
        <Icon name="chevL" size={13} /> Back to Projects
      </button>
    </div>
  );

  const p = project;
  const pct = parseFloat(p.progress_pct || p.completion_pct || 0);
  const pill = STATUS_PILL[p.status] || 'muted';
  const openRFIs = rfis.filter(r => r.status !== 'closed').length;
  const openSubmittals = submittals.filter(s => s.status !== 'approved' && s.status !== 'rejected').length;
  const openCOs = changeOrders.filter(co => co.status === 'pending_approval').length;
  const highRisks = risks.filter(r => r.likelihood * r.impact >= 12).length;

  return (
    <>
      {/* Back breadcrumb */}
      <div style={{ padding: '10px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn ghost sm" onClick={() => navigate('/dashboard/projects')}>
          <Icon name="chevL" size={12} /> Projects
        </button>
        <span style={{ color: 'var(--text-mute)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {p.project_number || p.id}
        </span>
      </div>

      {/* Hero header */}
      <div style={{ padding: '20px 32px 0', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace'
          }}>
            {(p.project_number || 'PRJ').slice(-4)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', fontWeight: 700 }}>
                {p.project_number}
              </span>
              <span style={{ color: 'var(--text-mute)' }}>·</span>
              <span className={`pill ${pill}`}>{STATUS_LABEL[p.status] || p.status || 'Active'}</span>
              {openCOs > 0 && <span className="pill warn">{openCOs} COs pending</span>}
              {highRisks > 0 && <span className="pill danger">{highRisks} high risks</span>}
              <div style={{ flex: 1 }} />
              <button className="btn sm ghost"><Icon name="link" size={12} /> Copy link</button>
              <button className="btn sm ghost"><Icon name="download" size={12} /> Status pack</button>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{p.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              {p.site_address && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="pin" size={11} /> {p.site_address}
                </span>
              )}
              {p.client_name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="contacts" size={11} /> {p.client_name}
                </span>
              )}
              {p.pm_name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="user" size={11} /> {p.pm_name}
                </span>
              )}
              {p.start_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="calendar" size={11} />
                  {p.start_date?.slice(0, 10)} → {p.end_date?.slice(0, 10) || '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ margin: '0 -32px', padding: '0 32px' }}>
          {DETAIL_TABS.map(t => {
            let badge = null;
            if (t.id === 'commercial') badge = openCOs + changeOrders.length;
            if (t.id === 'quality')    badge = openRFIs + openSubmittals;
            return (
              <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                <Icon name={t.icon} size={12} /> {t.label}
                {badge > 0 && (
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, background: 'var(--bg-2)', color: 'var(--text-dim)', fontWeight: 700, marginLeft: 3 }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="page-body">
        {tab === 'overview'   && <OverviewTab   p={p} rfis={rfis} changeOrders={changeOrders} risks={risks} pct={pct} />}
        {tab === 'programme'  && <ProgrammeTab  p={p} />}
        {tab === 'commercial' && <CommercialTab p={p} changeOrders={changeOrders} />}
        {tab === 'tracking'   && <TrackingTab   p={p} />}
        {tab === 'quality'    && <QualityTab    p={p} rfis={rfis} submittals={submittals} />}
        {tab === 'team'       && <TeamTab       p={p} />}
        {tab === 'documents'  && <DocumentsTab  p={p} />}
      </div>
    </>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ p, rfis, changeOrders, risks, pct }) {
  const contract = parseFloat(p.contract_sum || 0);
  const retention = contract * (parseFloat(p.retention_percentage || 10) / 100);
  const certified = contract * (pct / 100);
  const voApproved = changeOrders.filter(co => co.status === 'approved').reduce((s, co) => s + parseFloat(co.cost_change || 0), 0);
  const voOpen = changeOrders.filter(co => ['pending_approval','submitted'].includes(co.status)).length;
  const openRFIs = rfis.filter(r => r.status !== 'closed').length;
  const highRisks = risks.filter(r => r.likelihood * r.impact >= 12).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Contract Sum',     value: fmt(contract),     foot: 'LOA value' },
          { label: 'Certified to date', value: fmt(certified),    foot: `${pct}% complete` },
          { label: 'Retention held',   value: fmt(retention),    foot: `${p.retention_percentage || 10}% · releases on CCC` },
          { label: 'VO (approved)',     value: fmt(voApproved),   foot: `${changeOrders.filter(c => c.status === 'approved').length} approved`, tone: voApproved >= 0 ? 'good' : 'danger' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 16 }}>
        {/* Progress S-curve */}
        <div className="card">
          <div className="card-head">
            <h3>Progress</h3>
            <span className="page-sub">Actual vs planned cumulative %</span>
            <div style={{ flex: 1 }} />
            <span className="pill outline" style={{ padding: '1px 8px' }}>{pct}% actual</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <SCurveChart actual={pct / 100} />
          </div>
        </div>

        {/* Health panel */}
        <div className="card">
          <div className="card-head"><h3>Health</h3></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Open COs / VOs',   val: voOpen,    foot: `${changeOrders.length} total`,                      tone: voOpen > 0 ? 'warn' : 'good' },
              { label: 'Open RFIs',        val: openRFIs,  foot: `${rfis.length} total`,                               tone: openRFIs > 0 ? 'info' : 'good' },
              { label: 'Active risks',     val: risks.length, foot: `${highRisks} high severity`,                     tone: highRisks > 0 ? 'danger' : 'info' },
              { label: 'Open milestones',  val: (p.milestones || []).filter(m => m.status !== 'done').length, foot: `${(p.milestones||[]).length} total`, tone: 'info' },
              { label: 'Open tasks',       val: parseInt(p.open_tasks || 0), foot: 'assigned to team',               tone: parseInt(p.open_tasks) > 0 ? 'warn' : 'good' },
            ].map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span className={`pill ${h.tone}`} style={{ minWidth: 36, justifyContent: 'center', padding: '2px 8px', fontWeight: 700 }}>{h.val}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{h.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{h.foot}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 16 }}>
        <div className="card">
          <div className="card-head"><h3>Key dates</h3><span className="page-sub">Contractual + milestones</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <tbody>
                {[
                  { lbl: 'Site possession', date: p.start_date, done: true },
                  ...(p.milestones || []).map(m => ({
                    lbl: m.title, date: m.due_date,
                    done: m.status === 'done', isCritical: m.is_critical
                  })),
                  { lbl: 'Practical completion', date: p.end_date, done: pct >= 100 },
                ].map((d, i) => (
                  <tr key={i}>
                    <td style={{ width: 26 }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: d.done ? 'var(--good)' : 'var(--surface)',
                        border: `1.5px solid ${d.done ? 'var(--good)' : 'var(--border-strong)'}`,
                      }}>
                        {d.done && <Icon name="check" size={9} style={{ color: 'white' }} />}
                      </span>
                    </td>
                    <td style={{ fontWeight: d.isCritical ? 600 : 400 }}>
                      {d.lbl}
                      {d.isCritical && <span className="pill danger" style={{ marginLeft: 6, padding: '0 5px', fontSize: 9.5 }}>critical</span>}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)' }}>{d.date?.slice(0, 10) || '—'}</td>
                    <td>
                      <span className={`pill ${d.done ? 'good' : 'outline'}`} style={{ padding: '0 7px' }}>
                        {d.done ? 'done' : daysFrom(d.date)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top risks */}
        <div className="card">
          <div className="card-head"><h3>Top risks</h3><span className="page-sub">{risks.length} active</span></div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No risks registered for this project.</div>
            ) : risks.sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact)).slice(0, 5).map(r => {
              const s = r.likelihood * r.impact;
              const tone = s >= 16 ? 'danger' : s >= 9 ? 'warn' : 'info';
              return (
                <div key={r.id} style={{
                  border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)'
                }}>
                  <span className={`pill ${tone}`} style={{ padding: '0 7px', minWidth: 42, justifyContent: 'center' }}>
                    L{r.likelihood}·I{r.impact}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r.category} · {r.owner}</div>
                  </div>
                  <Icon
                    name={r.trend === 'up' ? 'arrowU' : r.trend === 'down' ? 'arrowD' : 'arrowR'}
                    size={12}
                    style={{ color: r.trend === 'up' ? 'var(--danger)' : r.trend === 'down' ? 'var(--good)' : 'var(--text-mute)', flexShrink: 0 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SVG S-curve chart ─────────────────────────────────────────────────────────
function SCurveChart({ actual = 0.5 }) {
  const W = 640, H = 180, pL = 40, pR = 12, pT = 12, pB = 28, N = 30;
  const sigmoid = (i) => 1 / (1 + Math.exp(-9 * ((i / (N - 1)) - 0.5)));
  const planArr = Array.from({ length: N }, (_, i) => sigmoid(i));
  const xAt = (i) => pL + (i / (N - 1)) * (W - pL - pR);
  const yAt = (v) => pT + (1 - v) * (H - pT - pB);
  const lineD = (arr) => arr.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1)).join(' ');
  const todayIdx = Math.round((N - 1) * 0.5);
  const actIdx   = Math.round((N - 1) * actual);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="actGrad-detail" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".2" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, .25, .5, .75, 1].map(v => (
        <g key={v}>
          <line x1={pL} x2={W - pR} y1={yAt(v)} y2={yAt(v)} stroke="var(--border)" strokeDasharray={v === 0 ? '' : '2 4'} />
          <text x={pL - 6} y={yAt(v) + 3} fontSize="9.5" fill="var(--text-mute)" textAnchor="end" fontFamily="JetBrains Mono">{Math.round(v * 100)}%</text>
        </g>
      ))}
      <path d={`${lineD(planArr)} L ${xAt(N-1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`} fill="rgba(0,0,0,.04)" />
      <path d={lineD(planArr)} stroke="var(--text-mute)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
      <path d={`${lineD(planArr.slice(0, actIdx + 1))} L ${xAt(actIdx)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`} fill="url(#actGrad-detail)" />
      <path d={lineD(planArr.slice(0, actIdx + 1))} stroke="var(--accent)" strokeWidth="2" fill="none" />
      <line x1={xAt(todayIdx)} x2={xAt(todayIdx)} y1={pT} y2={H - pB} stroke="var(--text-dim)" strokeWidth="1" strokeDasharray="3 3" opacity=".5" />
      <circle cx={xAt(actIdx)} cy={yAt(planArr[actIdx])} r="4.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      <text x={xAt(actIdx) + 8} y={yAt(planArr[actIdx]) - 8} fontSize="10.5" fill="var(--accent)" fontWeight="700" fontFamily="JetBrains Mono">{Math.round(actual * 100)}%</text>
      {[0, 6, 12, 18, 24, N - 1].map(i => (
        <text key={i} x={xAt(i)} y={H - 8} fontSize="9" fill="var(--text-mute)" textAnchor="middle">M{i + 1}</text>
      ))}
    </svg>
  );
}

// ── Programme tab ─────────────────────────────────────────────────────────────
function ProgrammeTab({ p }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', p.id],
    queryFn: () => api.get(`/projects/${p.id}/tasks`).then(r => r.data).catch(() => []),
  });
  const { data: milestones = p.milestones || [] } = useQuery({
    queryKey: ['project-milestones', p.id],
    queryFn: () => api.get(`/projects/${p.id}/milestones`).then(r => r.data).catch(() => p.milestones || []),
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, status }) => api.patch(`/projects/${p.id}/tasks/${taskId}`, { status }),
    onSuccess: () => qc.invalidateQueries(['project-tasks', p.id]),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Total tasks',    value: tasks.length },
          { label: 'Completed',      value: tasks.filter(t => t.status === 'done').length, tone: 'good' },
          { label: 'In progress',    value: tasks.filter(t => t.status === 'in_progress').length, tone: 'info' },
          { label: 'Milestones',     value: milestones.length },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Milestones */}
      <div className="card">
        <div className="card-head">
          <h3>Milestones</h3>
          <span className="page-sub">{milestones.length} milestones</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary" onClick={() => setShowAdd('milestone')}>
            <Icon name="plus" size={12} /> Add Milestone
          </button>
        </div>
        {milestones.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No milestones yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Milestone</th><th>Due Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {milestones.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.title}</div>
                      {m.description && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.description}</div>}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)' }}>{m.due_date?.slice(0,10) || '—'}</td>
                    <td>
                      <span className={`pill ${m.status === 'done' ? 'good' : m.is_critical ? 'danger' : 'outline'}`}>
                        {m.status === 'done' ? 'done' : daysFrom(m.due_date)}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {m.is_critical && <span className="pill danger" style={{ padding: '0 5px' }}>critical</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="card">
        <div className="card-head">
          <h3>Tasks</h3>
          <span className="page-sub">{tasks.length} tasks · {tasks.filter(t => t.status === 'done').length} done</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary" onClick={() => setShowAdd('task')}>
            <Icon name="plus" size={12} /> Add Task
          </button>
        </div>
        {tasks.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No tasks yet. Add a task to get started.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Status</th></tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.assignee_name || '—'}</td>
                    <td>
                      <span className={`pill ${t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warn' : 'outline'}`}>
                        {t.priority || 'medium'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)' }}>
                      {t.due_date ? daysFrom(t.due_date) : '—'}
                    </td>
                    <td>
                      <select
                        className="input"
                        value={t.status || 'todo'}
                        style={{ padding: '2px 6px', height: 24, fontSize: 11, width: 'auto', minWidth: 100 }}
                        onChange={e => toggleTask.mutate({ taskId: t.id, status: e.target.value })}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd === 'task' && <AddTaskModal projectId={p.id} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); qc.invalidateQueries(['project-tasks', p.id]); }} />}
      {showAdd === 'milestone' && <AddMilestoneModal projectId={p.id} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); qc.invalidateQueries(['project-milestones', p.id]); }} />}
    </div>
  );
}

// ── Commercial tab ────────────────────────────────────────────────────────────
function CommercialTab({ p, changeOrders }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filterCO, setFilterCO] = useState('all');

  const approved = changeOrders.filter(co => co.status === 'approved');
  const open     = changeOrders.filter(co => ['pending_approval','submitted'].includes(co.status));
  const approvedVal = approved.reduce((s, co) => s + parseFloat(co.cost_change || 0), 0);
  const openVal     = open.reduce((s, co) => s + parseFloat(co.cost_change || 0), 0);

  const filteredCOs = changeOrders.filter(co => {
    if (filterCO === 'open') return ['pending_approval','submitted'].includes(co.status);
    if (filterCO === 'approved') return co.status === 'approved';
    return true;
  });

  const approveCO = useMutation({
    mutationFn: (coId) => api.patch(`/projects/${p.id}/change-orders/${coId}`, { status: 'approved' }),
    onSuccess: () => qc.invalidateQueries(['project-change-orders', p.id]),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Base contract',   value: fmt(parseFloat(p.contract_sum || 0) - approvedVal), foot: 'LOA value' },
          { label: 'Approved COs',    value: fmt(approvedVal), foot: `${approved.length} approved`, tone: approvedVal >= 0 ? 'good' : 'danger' },
          { label: 'Open exposure',   value: fmt(openVal), foot: `${open.length} pending`, tone: 'warn' },
          { label: 'Revised contract', value: fmt(parseFloat(p.contract_sum || 0) + approvedVal), foot: 'incl. approved' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Change Orders / Variations</h3>
          <span className="page-sub">{changeOrders.length} on file · {open.length} pending</span>
          <div style={{ flex: 1 }} />
          <div className="seg-toggle">
            <button aria-pressed={filterCO === 'all'}      onClick={() => setFilterCO('all')}>All ({changeOrders.length})</button>
            <button aria-pressed={filterCO === 'open'}     onClick={() => setFilterCO('open')}>Open ({open.length})</button>
            <button aria-pressed={filterCO === 'approved'} onClick={() => setFilterCO('approved')}>Approved</button>
          </div>
          <button className="btn sm primary" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={12} /> Raise CO
          </button>
        </div>
        {filteredCOs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No change orders yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>CO #</th><th>Title</th><th>Origin</th><th>Status</th>
                  <th className="tbl-mono">Cost</th><th className="tbl-mono">Time</th>
                  <th className="tbl-mono">Raised</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filteredCOs.map(co => (
                  <tr key={co.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{co.co_number}</td>
                    <td>{co.title}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{co.origin || '—'}</td>
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
                    <td className="tbl-mono" style={{ color: 'var(--text-dim)' }}>{co.time_change ? `${co.time_change}d` : '—'}</td>
                    <td className="tbl-mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>{co.created_at?.slice(0,10)}</td>
                    <td>
                      {co.status === 'pending_approval' && (
                        <button className="btn sm ghost" onClick={() => approveCO.mutate(co.id)}>
                          <Icon name="check" size={11} /> Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddChangeOrderModal
          projectId={p.id}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); qc.invalidateQueries(['project-change-orders', p.id]); }}
        />
      )}
    </div>
  );
}

// ── Quality tab (RFIs + Submittals) ───────────────────────────────────────────
function QualityTab({ p, rfis, submittals }) {
  const qc = useQueryClient();
  const [view, setView] = useState('rfis');
  const [showAddRFI, setShowAddRFI] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Open RFIs',       value: rfis.filter(r => r.status !== 'closed').length, tone: 'info' },
          { label: 'Closed RFIs',     value: rfis.filter(r => r.status === 'closed').length, tone: 'good' },
          { label: 'Open submittals', value: submittals.filter(s => !['approved','rejected'].includes(s.status)).length, tone: 'warn' },
          { label: 'Approved submittals', value: submittals.filter(s => s.status === 'approved').length, tone: 'good' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="seg-toggle">
            <button aria-pressed={view === 'rfis'} onClick={() => setView('rfis')}>
              RFIs <span style={{ fontSize: 10, marginLeft: 4, background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 99 }}>{rfis.length}</span>
            </button>
            <button aria-pressed={view === 'submittals'} onClick={() => setView('submittals')}>
              Submittals <span style={{ fontSize: 10, marginLeft: 4, background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 99 }}>{submittals.length}</span>
            </button>
          </div>
          <div style={{ flex: 1 }} />
          {view === 'rfis' && (
            <button className="btn sm primary" onClick={() => setShowAddRFI(true)}>
              <Icon name="plus" size={12} /> Raise RFI
            </button>
          )}
          {view === 'submittals' && (
            <button className="btn sm primary" onClick={() => setShowAddSub(true)}>
              <Icon name="plus" size={12} /> New Submittal
            </button>
          )}
        </div>

        {view === 'rfis' && (
          rfis.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No RFIs raised yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th>RFI #</th><th>Subject</th><th>Directed To</th><th>Urgency</th><th>Status</th><th className="tbl-mono">Due</th><th className="tbl-mono">Raised</th></tr>
                </thead>
                <tbody>
                  {rfis.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.rfi_number}</td>
                      <td>{r.subject}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{r.directed_to || '—'}</td>
                      <td>
                        <span className={`pill ${r.urgency === 'urgent' ? 'danger' : r.urgency === 'high' ? 'warn' : 'outline'}`}>
                          {r.urgency || 'normal'}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${r.status === 'closed' ? 'good' : r.status === 'responded' ? 'info' : r.status === 'submitted' ? 'accent' : 'warn'}`}>
                          {r.status || 'draft'}
                        </span>
                      </td>
                      <td className="tbl-mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>{r.due_date?.slice(0,10) || '—'}</td>
                      <td className="tbl-mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>{r.created_at?.slice(0,10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {view === 'submittals' && (
          submittals.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No submittals yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th>Sub #</th><th>Title</th><th>Type</th><th>Revision</th><th>Status</th><th className="tbl-mono">Due</th></tr>
                </thead>
                <tbody>
                  {submittals.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{s.submittal_number}</td>
                      <td>{s.title}</td>
                      <td><span className="pill outline" style={{ padding: '0 7px' }}>{s.submittal_type?.replace(/_/g, ' ')}</span></td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{s.revision_number}</td>
                      <td>
                        <span className={`pill ${s.status === 'approved' ? 'good' : s.status === 'rejected' ? 'danger' : s.status === 'under_review' ? 'warn' : 'info'}`}>
                          {s.status?.replace(/_/g, ' ') || 'submitted'}
                        </span>
                      </td>
                      <td className="tbl-mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>{s.due_date?.slice(0,10) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showAddRFI && <AddRFIModal projectId={p.id} onClose={() => setShowAddRFI(false)} onSaved={() => { setShowAddRFI(false); qc.invalidateQueries(['project-rfis', p.id]); }} />}
      {showAddSub && <AddSubmittalModal projectId={p.id} onClose={() => setShowAddSub(false)} onSaved={() => { setShowAddSub(false); qc.invalidateQueries(['project-submittals', p.id]); }} />}
    </div>
  );
}

// ── Team tab ──────────────────────────────────────────────────────────────────
function TeamTab({ p }) {
  const { data: members = p.members || [] } = useQuery({
    queryKey: ['project-members', p.id],
    queryFn: () => api.get(`/projects/${p.id}/members`).then(r => r.data).catch(() => p.members || []),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-head">
          <h3>Project team</h3>
          <span className="page-sub">{members.length} members</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost"><Icon name="plus" size={12} /> Add member</button>
        </div>
        {members.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-mute)', fontSize: 12 }}>No members assigned.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Name</th><th>System Role</th><th>Project Role</th></tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.email}</div>
                    </td>
                    <td><span className="pill outline" style={{ padding: '0 7px' }}>{m.role}</span></td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{m.role_in_project || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project details */}
      <div className="card">
        <div className="card-head"><h3>Project details</h3></div>
        <div style={{ padding: '0 0 8px' }}>
          <table className="tbl">
            <tbody>
              {[
                { label: 'Project number', value: p.project_number },
                { label: 'Site address',   value: p.site_address || '—' },
                { label: 'Client',         value: p.client_name || '—' },
                { label: 'Project Manager', value: p.pm_name || '—' },
                { label: 'Start date',     value: p.start_date?.slice(0,10) || '—' },
                { label: 'End date',       value: p.end_date?.slice(0,10) || '—' },
                { label: 'Contract sum',   value: fmt(p.contract_sum) },
                { label: 'Retention',      value: `${p.retention_percentage || 10}%` },
                { label: 'Status',         value: p.status },
              ].map(row => (
                <tr key={row.label}>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12, width: 160 }}>{row.label}</td>
                  <td style={{ fontWeight: 500 }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Documents tab ─────────────────────────────────────────────────────────────
function DocumentsTab({ p }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>Documents</h3>
        <span className="page-sub">Project-linked documents</span>
        <div style={{ flex: 1 }} />
        <button className="btn sm primary"><Icon name="plus" size={12} /> Upload</button>
      </div>
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-mute)' }}>
        <Icon name="doc" size={32} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 13 }}>Documents linked to this project will appear here.</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Use the Document Manager to upload and manage files.</div>
      </div>
    </div>
  );
}

// ── Add modals ────────────────────────────────────────────────────────────────
function SimpleModal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {children}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTaskModal({ projectId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/projects/${projectId}/tasks`, { title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate }); onSaved(); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); setSaving(false); }
  };
  return (
    <SimpleModal title="Add Task" onClose={onClose} onSubmit={handleSubmit} saving={saving}>
      <div className="form-group"><label className="label">Task title *</label><input className="input" required {...f('title')} /></div>
      <div className="form-group"><label className="label">Description</label><textarea className="input" rows={2} style={{ resize: 'vertical' }} {...f('description')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="label">Priority</label>
          <select className="input" {...f('priority')}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </div>
        <div className="form-group"><label className="label">Due date</label><input type="date" className="input" {...f('dueDate')} /></div>
      </div>
    </SimpleModal>
  );
}

function AddMilestoneModal({ projectId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', dueDate: '', description: '', isCritical: false });
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/projects/${projectId}/milestones`, { title: form.title, dueDate: form.dueDate, description: form.description, isCritical: form.isCritical }); onSaved(); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); setSaving(false); }
  };
  return (
    <SimpleModal title="Add Milestone" onClose={onClose} onSubmit={handleSubmit} saving={saving}>
      <div className="form-group"><label className="label">Milestone title *</label><input className="input" required {...f('title')} /></div>
      <div className="form-group"><label className="label">Description</label><textarea className="input" rows={2} style={{ resize: 'vertical' }} {...f('description')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group"><label className="label">Due date *</label><input type="date" className="input" required {...f('dueDate')} /></div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
          <input type="checkbox" id="critical" checked={form.isCritical} onChange={e => setForm(p => ({ ...p, isCritical: e.target.checked }))} />
          <label htmlFor="critical" className="label" style={{ marginBottom: 0 }}>Critical path</label>
        </div>
      </div>
    </SimpleModal>
  );
}

function AddRFIModal({ projectId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', directedTo: '', urgency: 'normal', dueDate: '' });
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/projects/${projectId}/rfis`, { subject: form.subject, description: form.description, directedTo: form.directedTo, urgency: form.urgency, dueDate: form.dueDate }); onSaved(); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); setSaving(false); }
  };
  return (
    <SimpleModal title="Raise RFI" onClose={onClose} onSubmit={handleSubmit} saving={saving}>
      <div className="form-group"><label className="label">Subject *</label><input className="input" required {...f('subject')} /></div>
      <div className="form-group"><label className="label">Description</label><textarea className="input" rows={3} style={{ resize: 'vertical' }} {...f('description')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group"><label className="label">Directed to</label><input className="input" placeholder="e.g. Architect, CA" {...f('directedTo')} /></div>
        <div className="form-group">
          <label className="label">Urgency</label>
          <select className="input" {...f('urgency')}>
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div className="form-group"><label className="label">Response due</label><input type="date" className="input" {...f('dueDate')} /></div>
    </SimpleModal>
  );
}

function AddSubmittalModal({ projectId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', submittalType: 'shop_drawing', description: '', revisionNumber: 'Rev 0', dueDate: '' });
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/projects/${projectId}/submittals`, { title: form.title, submittalType: form.submittalType, description: form.description, revisionNumber: form.revisionNumber, dueDate: form.dueDate }); onSaved(); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); setSaving(false); }
  };
  return (
    <SimpleModal title="New Submittal" onClose={onClose} onSubmit={handleSubmit} saving={saving}>
      <div className="form-group"><label className="label">Title *</label><input className="input" required {...f('title')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="label">Type</label>
          <select className="input" {...f('submittalType')}>
            <option value="shop_drawing">Shop Drawing</option>
            <option value="material_sample">Material Sample</option>
            <option value="method_statement">Method Statement</option>
            <option value="technical_data">Technical Data Sheet</option>
          </select>
        </div>
        <div className="form-group"><label className="label">Revision</label><input className="input" placeholder="Rev 0" {...f('revisionNumber')} /></div>
      </div>
      <div className="form-group"><label className="label">Description</label><textarea className="input" rows={2} style={{ resize: 'vertical' }} {...f('description')} /></div>
      <div className="form-group"><label className="label">Review due</label><input type="date" className="input" {...f('dueDate')} /></div>
    </SimpleModal>
  );
}

function AddChangeOrderModal({ projectId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', reason: '', origin: 'Internal', costChange: '', timeChange: '', scopeChange: '' });
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/projects/${projectId}/change-orders`, {
        title: form.title, description: form.description, reason: form.reason,
        origin: form.origin, costChange: form.costChange,
        timeChange: form.timeChange, scopeChange: form.scopeChange
      });
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); setSaving(false); }
  };
  const costVal = parseFloat(form.costChange || 0);
  return (
    <SimpleModal title="Raise Change Order" onClose={onClose} onSubmit={handleSubmit} saving={saving}>
      <div className="form-group"><label className="label">Title *</label><input className="input" required {...f('title')} /></div>
      <div className="form-group"><label className="label">Reason / description</label><textarea className="input" rows={2} style={{ resize: 'vertical' }} {...f('reason')} /></div>
      <div className="form-group"><label className="label">Scope change description</label><textarea className="input" rows={2} style={{ resize: 'vertical' }} {...f('scopeChange')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="form-group"><label className="label">Cost change (RM)</label><input type="number" className="input" placeholder="e.g. 50000" {...f('costChange')} /></div>
        <div className="form-group"><label className="label">Time change (days)</label><input type="number" className="input" placeholder="e.g. 14" {...f('timeChange')} /></div>
        <div className="form-group">
          <label className="label">Origin</label>
          <select className="input" {...f('origin')}>
            <option value="Internal">Internal</option>
            <option value="Client">Client</option>
            <option value="Architect">Architect</option>
            <option value="Authority">Authority</option>
            <option value="Force Majeure">Force Majeure</option>
          </select>
        </div>
      </div>
      {Math.abs(costVal) < 50000 && form.costChange && (
        <div style={{ padding: '8px 12px', background: 'var(--good-soft)', border: '1px solid var(--good)', borderRadius: 6, fontSize: 12, color: 'var(--good)' }}>
          <Icon name="check" size={13} style={{ marginRight: 6 }} />
          Small change order — will be auto-approved (under RM 50,000).
        </div>
      )}
      {Math.abs(costVal) >= 50000 && form.costChange && (
        <div style={{ padding: '8px 12px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 6, fontSize: 12, color: 'var(--warn)' }}>
          <Icon name="alert" size={13} style={{ marginRight: 6 }} />
          Large change order — requires PM & Director approval.
        </div>
      )}
    </SimpleModal>
  );
}

// ── Scope & Diary tab (PMO scope tracking + site diaries) ─────────────────────
function ProgressBar({ pct }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div style={{ height: 8, borderRadius: 5, background: 'var(--bg-2)', overflow: 'hidden', minWidth: 80 }}>
      <div style={{ width: `${v}%`, height: '100%', background: v >= 100 ? 'var(--good)' : 'var(--accent)', transition: 'width .6s' }} />
    </div>
  );
}

function TrackingTab({ p }) {
  const qc = useQueryClient();
  const [view, setView] = useState('scope');
  const [openDiary, setOpenDiary] = useState(null);
  const [importBq, setImportBq] = useState('');

  const { data: bqs = [] } = useQuery({ queryKey: ['proj-bq', p.id], queryFn: () => api.get(`/projects/${p.id}/bq`).then(r => r.data).catch(() => []) });
  const { data: scope = { items: [], sections: [], total_amount: 0, pct_complete: 0, line_count: 0 } } =
    useQuery({ queryKey: ['proj-scope', p.id], queryFn: () => api.get(`/projects/${p.id}/scope`).then(r => r.data) });
  const { data: diaries = [] } = useQuery({ queryKey: ['proj-diaries', p.id], queryFn: () => api.get(`/projects/${p.id}/diaries`).then(r => r.data).catch(() => []) });

  const doImport = async () => {
    if (!importBq) return;
    try {
      const r = await api.post(`/projects/${p.id}/import-bq/${importBq}`);
      qc.invalidateQueries({ queryKey: ['proj-scope', p.id] });
      alert(`${r.data.imported} scope line(s) imported.${r.data.warning ? '\n' + r.data.warning : ''}`);
    } catch (e) { alert(e.response?.data?.error || 'Import failed.'); }
  };

  return (
    <div className="dash-page">
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab${view === 'scope' ? ' active' : ''}`} onClick={() => setView('scope')}>Scope progress</button>
        <button className={`tab${view === 'diary' ? ' active' : ''}`} onClick={() => setView('diary')}>Site diary</button>
      </div>

      {view === 'scope' && (
        <>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Import BQ scope</div>
              <div style={{ flex: 1 }} />
              <select className="input" style={{ maxWidth: 320 }} value={importBq} onChange={e => setImportBq(e.target.value)}>
                <option value="">Select a BQ linked to this project…</option>
                {bqs.map(b => <option key={b.id} value={b.id}>{b.title} · {b.item_count} items ({b.status})</option>)}
              </select>
              <button className="btn primary sm" onClick={doImport} disabled={!importBq}><Icon name="plus" size={13} /> Import</button>
            </div>
            {bqs.length === 0 && (
              <div className="card-body" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                No BQ is linked to this project yet. On the Tender / BQ page, set a BQ's project, then import its scope here.
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Overall progress</div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{Number(scope.pct_complete || 0).toFixed(1)}%</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 10 }}>{scope.line_count} lines · {fmt(scope.total_amount)}</span>
            </div>
            <div className="card-body"><ProgressBar pct={scope.pct_complete} /></div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Progress by scope category</div></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>Scope category</th><th style={{ textAlign: 'right' }}>Lines</th><th style={{ textAlign: 'right' }}>Value</th><th style={{ width: 200 }}>Progress</th></tr></thead>
                <tbody>
                  {scope.sections.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-mute)' }}>No scope imported yet.</td></tr>}
                  {scope.sections.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{s.section}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{s.line_count}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{fmt(s.amount)}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ProgressBar pct={s.pct_complete} /><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', minWidth: 38, textAlign: 'right' }}>{Number(s.pct_complete).toFixed(0)}%</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'diary' && !openDiary && <DiaryList p={p} diaries={diaries} onOpen={setOpenDiary} qc={qc} />}
      {view === 'diary' && openDiary && <DiaryDetail p={p} diaryId={openDiary} scopeItems={scope.items} onBack={() => setOpenDiary(null)} qc={qc} />}
    </div>
  );
}

function DiaryList({ p, diaries, onOpen, qc }) {
  const [form, setForm] = useState({ diaryDate: new Date().toISOString().slice(0, 10), weather: '', manpower: '', notes: '' });
  const create = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post(`/projects/${p.id}/diaries`, form);
      qc.invalidateQueries({ queryKey: ['proj-diaries', p.id] });
      onOpen(r.data.id);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create diary.'); }
  };
  return (
    <>
      <div className="card">
        <div className="card-head"><div className="card-title">New site diary</div></div>
        <form onSubmit={create} className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: 8, alignItems: 'end' }}>
          <input className="input" type="date" value={form.diaryDate} onChange={e => setForm(f => ({ ...f, diaryDate: e.target.value }))} />
          <input className="input" placeholder="Weather" value={form.weather} onChange={e => setForm(f => ({ ...f, weather: e.target.value }))} />
          <input className="input" type="number" placeholder="Manpower" value={form.manpower} onChange={e => setForm(f => ({ ...f, manpower: e.target.value }))} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <button className="btn primary" type="submit"><Icon name="plus" size={14} /> Add</button>
        </form>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Site diaries</div><span className="card-sub" style={{ marginLeft: 6 }}>{diaries.length}</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Date</th><th>Weather</th><th style={{ textAlign: 'right' }}>Manpower</th><th style={{ textAlign: 'right' }}>Entries</th><th style={{ textAlign: 'right' }}>Photos</th><th>By</th><th></th></tr></thead>
            <tbody>
              {diaries.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-mute)' }}>No diaries yet.</td></tr>}
              {diaries.map(d => (
                <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(d.id)}>
                  <td style={{ fontWeight: 600 }}>{d.diary_date}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{d.weather || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{d.manpower ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{d.entry_count}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{d.photo_count}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{d.author_name || '—'}</td>
                  <td><Icon name="chevR" size={12} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function DiaryDetail({ p, diaryId, scopeItems, onBack, qc }) {
  const { data: diary, refetch } = useQuery({ queryKey: ['diary', diaryId], queryFn: () => api.get(`/projects/${p.id}/diaries/${diaryId}`).then(r => r.data) });
  const [entry, setEntry] = useState({ scopeId: '', qtyDone: '', remarks: '' });

  const addEntry = async (e) => {
    e.preventDefault();
    if (!entry.scopeId) return alert('Pick a scope category.');
    try {
      await api.post(`/projects/${p.id}/diaries/${diaryId}/entries`, entry);
      setEntry({ scopeId: '', qtyDone: '', remarks: '' });
      refetch(); qc.invalidateQueries({ queryKey: ['proj-scope', p.id] });
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
  };
  const uploadPhotos = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach(f => fd.append('photos', f));
    try {
      await api.post(`/projects/${p.id}/diaries/${diaryId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      refetch();
    } catch (err) { alert(err.response?.data?.error || 'Upload failed.'); }
  };

  if (!diary) return <div className="card"><div className="card-body">Loading…</div></div>;
  return (
    <>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 12 }}><Icon name="chevL" size={14} /> All diaries</button>
      <div className="card">
        <div className="card-head">
          <div><div className="card-title">{diary.diary_date}</div><div className="card-sub">{diary.weather || '—'} · {diary.manpower ?? 0} crew{diary.notes ? ' · ' + diary.notes : ''}</div></div>
        </div>
        <form onSubmit={addEntry} className="card-body" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 2fr auto', gap: 8, alignItems: 'end' }}>
          <select className="input" value={entry.scopeId} onChange={e => setEntry(s => ({ ...s, scopeId: e.target.value }))}>
            <option value="">Scope category / item…</option>
            {scopeItems.map(s => <option key={s.id} value={s.id}>{(s.section ? s.section + ' — ' : '') + (s.description || '').slice(0, 50)}</option>)}
          </select>
          <input className="input" type="number" placeholder="Qty done" value={entry.qtyDone} onChange={e => setEntry(s => ({ ...s, qtyDone: e.target.value }))} />
          <input className="input" placeholder="Remarks" value={entry.remarks} onChange={e => setEntry(s => ({ ...s, remarks: e.target.value }))} />
          <button className="btn primary" type="submit"><Icon name="plus" size={14} /> Log</button>
        </form>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Progress entries</div></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Scope category</th><th>Item</th><th style={{ textAlign: 'right' }}>Qty done</th><th>Remarks</th></tr></thead>
            <tbody>
              {diary.entries.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: 'var(--text-mute)' }}>No entries yet.</td></tr>}
              {diary.entries.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.section || '—'}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{(e.scope_description || '').slice(0, 50)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{e.qty_done} {e.unit || ''}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{e.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Work proof photos</div>
          <div style={{ flex: 1 }} />
          <label className="btn sm primary" style={{ cursor: 'pointer' }}>
            <Icon name="paperclip" size={13} /> Upload
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => uploadPhotos(e.target.files)} />
          </label>
        </div>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {diary.photos.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-mute)' }}>No photos yet.</div>}
          {diary.photos.map(ph => (
            <a key={ph.id} href={ph.url} target="_blank" rel="noreferrer" title={ph.caption || ''}>
              <img src={ph.url} alt={ph.caption || 'proof'} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
