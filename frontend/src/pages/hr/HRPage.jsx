import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import api from '../../lib/api';
import Icon from '../../components/Icon';

// ── helpers ────────────────────────────────────────────────────────────────────
const fmtDate  = (s) => s ? new Date(s).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime  = (s) => s ? new Date(s).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
const fmtHours = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) return '—';
  const mins = differenceInMinutes(new Date(clockOut), new Date(clockIn));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
const isToday  = (s) => { if (!s) return false; const d = new Date(s), n = new Date(); return d.toDateString() === n.toDateString(); };

const LEAVE_TYPES  = ['annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity', 'other'];
const LEAVE_LABEL  = { annual: 'Annual', sick: 'MC / Sick', emergency: 'Emergency', unpaid: 'Unpaid', maternity: 'Maternity', paternity: 'Paternity', other: 'Other' };
const STATUS_TONE  = { pending: 'warn', approved: 'good', rejected: 'danger', cancelled: 'muted' };

const TABS = [
  { id: 'attendance',  label: 'Attendance',       icon: 'clock'    },
  { id: 'leave',       label: 'Leave',             icon: 'calendar' },
  { id: 'workforce',   label: 'Workforce',         icon: 'users'    },
  { id: 'foreign',     label: 'Foreign Workers',   icon: 'flag'     },
  { id: 'payroll',     label: 'Payroll',           icon: 'money'    },
];

// ── main ───────────────────────────────────────────────────────────────────────
export default function HRPage() {
  const [tab, setTab] = useState('attendance');
  const qc = useQueryClient();

  const { data: attendance = [], isLoading: loadAtt } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.get('/hr/attendance').then(r => r.data).catch(() => []),
  });
  const { data: leaves = [], isLoading: loadLeave } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => api.get('/hr/leave').then(r => r.data).catch(() => []),
  });

  // derived KPIs
  const activeSession  = attendance.find(a => !a.clock_out);
  const todayCount     = attendance.filter(a => isToday(a.clock_in) && a.clock_out).length + (activeSession ? 1 : 0);
  const pendingLeaves  = leaves.filter(l => l.status === 'pending').length;

  const clockIn = useMutation({
    mutationFn: () => api.post('/hr/clock-in', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
    onError: (err) => alert(err.response?.data?.error || 'Failed to clock in.'),
  });
  const clockOut = useMutation({
    mutationFn: () => api.post('/hr/clock-out', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
    onError: (err) => alert(err.response?.data?.error || 'Failed to clock out.'),
  });

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <h1 className="page-title">HR &amp; Workforce</h1>
          <p className="page-sub">Attendance · leave · site crew · foreign worker docs · payroll</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeSession ? (
            <>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--good)', boxShadow: '0 0 0 3px var(--good-soft)', display: 'inline-block' }} />
                  <span style={{ color: 'var(--good)', fontSize: 12, fontWeight: 600 }}>Clocked in</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>since {fmtTime(activeSession.clock_in)}</div>
              </div>
              <button className="btn sm ghost" onClick={() => clockOut.mutate()} disabled={clockOut.isPending}>
                {clockOut.isPending ? 'Clocking out…' : 'Clock Out'}
              </button>
            </>
          ) : (
            <button className="btn sm primary" onClick={() => clockIn.mutate()} disabled={clockIn.isPending}>
              <Icon name="clock" size={13} />
              {clockIn.isPending ? 'Clocking in…' : 'Clock In'}
            </button>
          )}
          <button className="btn sm ghost"><Icon name="download" size={13} /> Export</button>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="kpi-strip">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}>
          {[
            { label: 'On Site Today',     value: todayCount,     icon: 'users',    color: 'var(--accent)' },
            { label: 'Active Clock-ins',  value: activeSession ? 1 : 0, icon: 'clock', color: activeSession ? 'var(--good)' : 'var(--text-mute)' },
            { label: 'Pending Leave',     value: pendingLeaves,  icon: 'calendar', color: pendingLeaves > 0 ? 'var(--warn)' : 'var(--text-mute)' },
            { label: 'Attendance Records',value: attendance.length, icon: 'report', color: 'var(--text-dim)' },
            { label: 'Leave Requests',    value: leaves.length,  icon: 'flag',     color: 'var(--text-dim)' },
          ].map((k, i) => (
            <div key={i} className="kpi">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={k.icon} size={16} style={{ color: k.color, flexShrink: 0 }} />
                <span style={{ color: k.color }}>{k.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="tabs">
        {TABS.map(t => {
          let badge = null;
          if (t.id === 'leave') badge = pendingLeaves || null;
          return (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={13} />
              {t.label}
              {badge > 0 && (
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, background: 'var(--warn-soft)', color: 'var(--warn)', fontWeight: 700, marginLeft: 3 }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ────────────────────────────────────────────────────── */}
      <div className="page-body">
        {tab === 'attendance' && <AttendanceTab attendance={attendance} isLoading={loadAtt} />}
        {tab === 'leave'      && <LeaveTab leaves={leaves} isLoading={loadLeave} qc={qc} />}
        {tab === 'workforce'  && <WorkforceTab />}
        {tab === 'foreign'    && <ForeignWorkersTab />}
        {tab === 'payroll'    && <PayrollTab />}
      </div>
    </>
  );
}

// ── Attendance tab ─────────────────────────────────────────────────────────────
function AttendanceTab({ attendance, isLoading }) {
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    const today = new Date().toDateString();
    if (filter === 'today') return attendance.filter(a => new Date(a.clock_in).toDateString() === today);
    if (filter === 'active') return attendance.filter(a => !a.clock_out);
    return attendance;
  }, [attendance, filter]);

  if (isLoading) return <div style={{ padding: 32, color: 'var(--text-mute)', textAlign: 'center' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-head">
          <h3>Attendance log</h3>
          <span className="page-sub">{rows.length} records</span>
          <div style={{ flex: 1 }} />
          <div className="seg-toggle">
            <button aria-pressed={filter === 'all'}    onClick={() => setFilter('all')}>All</button>
            <button aria-pressed={filter === 'today'}  onClick={() => setFilter('today')}>Today</button>
            <button aria-pressed={filter === 'active'} onClick={() => setFilter('active')}>Active</button>
          </div>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Icon name="clock" size={32} style={{ color: 'var(--border-strong)', marginBottom: 10 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>No attendance records</div>
            <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>Use the Clock In button to start tracking.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Duration</th>
                  <th>Project</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.user_name || '—'}</td>
                    <td style={{ color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>{fmtDate(a.clock_in)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>{fmtTime(a.clock_in)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: a.clock_out ? 'var(--text)' : 'var(--text-mute)' }}>
                      {a.clock_out ? fmtTime(a.clock_out) : '—'}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--text-dim)' }}>
                      {fmtHours(a.clock_in, a.clock_out)}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{a.project_name || '—'}</td>
                    <td>
                      {!a.clock_out
                        ? <span className="pill good" style={{ fontSize: 10.5 }}>Active</span>
                        : <span className="pill outline" style={{ fontSize: 10.5 }}>Done</span>
                      }
                    </td>
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

// ── Leave tab ──────────────────────────────────────────────────────────────────
function LeaveTab({ leaves, isLoading, qc }) {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leaveType: 'annual', startDate: '', endDate: '', daysRequested: 1, reason: '' });

  const pending  = leaves.filter(l => l.status === 'pending').length;
  const approved = leaves.filter(l => l.status === 'approved').length;
  const rejected = leaves.filter(l => l.status === 'rejected').length;

  const filtered = useMemo(() => {
    if (filter === 'pending')  return leaves.filter(l => l.status === 'pending');
    if (filter === 'approved') return leaves.filter(l => l.status === 'approved');
    if (filter === 'rejected') return leaves.filter(l => l.status === 'rejected');
    return leaves;
  }, [leaves, filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/hr/leave', form);
      setShowNew(false);
      setForm({ leaveType: 'annual', startDate: '', endDate: '', daysRequested: 1, reason: '' });
      qc.invalidateQueries({ queryKey: ['leaves'] });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit leave.');
    } finally { setSaving(false); }
  };

  const reviewLeave = async (id, status) => {
    try {
      await api.patch(`/hr/leave/${id}/review`, { status });
      qc.invalidateQueries({ queryKey: ['leaves'] });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update leave.');
    }
  };

  if (isLoading) return <div style={{ padding: 32, color: 'var(--text-mute)', textAlign: 'center' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Total requests', value: leaves.length,  foot: 'all time' },
          { label: 'Pending review', value: pending,        foot: 'awaiting approval',  tone: pending > 0 ? 'warn' : undefined },
          { label: 'Approved',       value: approved,       foot: 'approved this year', tone: 'good' },
          { label: 'Rejected',       value: rejected,       foot: 'this year',          tone: rejected > 0 ? 'danger' : undefined },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Leave requests</h3>
          <span className="page-sub">{filtered.length} records</span>
          <div style={{ flex: 1 }} />
          <div className="seg-toggle">
            <button aria-pressed={filter === 'all'}      onClick={() => setFilter('all')}>All ({leaves.length})</button>
            <button aria-pressed={filter === 'pending'}  onClick={() => setFilter('pending')}>Pending ({pending})</button>
            <button aria-pressed={filter === 'approved'} onClick={() => setFilter('approved')}>Approved</button>
            <button aria-pressed={filter === 'rejected'} onClick={() => setFilter('rejected')}>Rejected</button>
          </div>
          <button className="btn sm primary" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={13} /> Apply Leave
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Icon name="calendar" size={32} style={{ color: 'var(--border-strong)', marginBottom: 10 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>
              {leaves.length === 0 ? 'No leave requests' : 'No records match this filter'}
            </div>
            {leaves.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>Click "Apply Leave" to submit a request.</div>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.user_name || '—'}</td>
                    <td><span className="pill outline" style={{ fontSize: 10.5 }}>{LEAVE_LABEL[l.leave_type] || l.leave_type}</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>{fmtDate(l.start_date)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>{fmtDate(l.end_date)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{l.days_requested}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 11.5, maxWidth: 200 }}>{l.reason || '—'}</td>
                    <td>
                      <span className={`pill ${STATUS_TONE[l.status] || 'muted'}`} style={{ fontSize: 10.5, textTransform: 'capitalize' }}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      {l.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn sm ghost" style={{ color: 'var(--good)', borderColor: 'var(--good-soft)' }} onClick={() => reviewLeave(l.id, 'approved')}>
                            <Icon name="check" size={11} />
                          </button>
                          <button className="btn sm ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => reviewLeave(l.id, 'rejected')}>
                            <Icon name="x" size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply leave modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Apply for Leave</span>
              <button className="icon-btn" onClick={() => setShowNew(false)}><Icon name="x" size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="label">Leave Type</label>
                  <select className="input" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{LEAVE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Start Date</label>
                    <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="label">End Date</label>
                    <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Number of Days</label>
                  <input type="number" className="input" min="0.5" step="0.5" value={form.daysRequested}
                    onChange={e => setForm(f => ({ ...f, daysRequested: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="label">Reason <span style={{ color: 'var(--text-mute)' }}>(optional)</span></label>
                  <textarea rows={2} className="input" style={{ resize: 'vertical' }} placeholder="Brief reason for leave…"
                    value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workforce tab ──────────────────────────────────────────────────────────────
function WorkforceTab() {
  const { data: projectsData } = useQuery({
    queryKey: ['projects-workforce'],
    queryFn: () => api.get('/projects').then(r => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: usersData } = useQuery({
    queryKey: ['users-workforce'],
    queryFn: () => api.get('/users').then(r => r.data),
    staleTime: 5 * 60_000,
  });

  const activeProjects = (projectsData?.projects || projectsData || []).filter(p => p.status === 'active');
  const totalUsers = (usersData?.users || usersData || []).length;

  // Synthetic trade breakdown — will be replaced when backend exposes /hr/workforce
  const TRADES = [
    { trade: 'General Workers',  count: 84 },
    { trade: 'Carpenters',       count: 32 },
    { trade: 'Bar Benders',      count: 28 },
    { trade: 'Concreters',       count: 24 },
    { trade: 'Plumbers (M&E)',   count: 19 },
    { trade: 'Electricians',     count: 17 },
    { trade: 'Welders',          count: 14 },
    { trade: 'Supervisors',      count: 12 },
  ];
  const total = TRADES.reduce((s, t) => s + t.count, 0);
  const maxCount = Math.max(...TRADES.map(t => t.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Total headcount', value: total,                 foot: 'est. site crew (sample)' },
          { label: 'Registered users', value: totalUsers || '—',   foot: 'on ContractOS', tone: 'info' },
          { label: 'Active projects',  value: activeProjects.length || '—', foot: 'with crew deployed', tone: 'good' },
          { label: 'Foreign workers',  value: '~60%',               foot: 'est. of headcount', tone: 'warn' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 16 }}>
        {/* Trade breakdown bar chart */}
        <div className="card">
          <div className="card-head">
            <h3>By trade</h3>
            <span className="page-sub">{total} workers · {TRADES.length} trades</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TRADES.map(t => (
              <div key={t.trade} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 130, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{t.trade}</div>
                <div style={{ flex: 1, height: 22, position: 'relative', background: 'var(--bg-2)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(t.count / maxCount) * 100}%`, height: '100%',
                    background: 'var(--accent)', borderRadius: 5,
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    color: 'white', fontSize: 10.5, fontWeight: 700,
                    transition: 'width 0.8s cubic-bezier(.22,.8,.25,1)'
                  }}>
                    {(t.count / maxCount) * 100 > 20 && t.count}
                  </div>
                </div>
                <div style={{ width: 30, fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, textAlign: 'right' }}>{t.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Site deployment table — live projects */}
        <div className="card">
          <div className="card-head">
            <h3>Site deployment</h3>
            <span className="page-sub">{activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {activeProjects.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-mute)', fontSize: 13 }}>
                No active projects found.
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Project</th><th>Phase</th><th>Contract Sum</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {activeProjects.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                        {p.site_address && <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{p.site_address}</div>}
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 11.5, textTransform: 'capitalize' }}>
                        {p.project_phase?.replace('_', ' ') || '—'}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--text-dim)' }}>
                        {p.contract_sum ? `RM ${parseFloat(p.contract_sum).toLocaleString('en-MY', { maximumFractionDigits: 0 })}` : '—'}
                      </td>
                      <td>
                        <span className="pill good" style={{ fontSize: 10.5 }}>Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming notice */}
      <div style={{
        padding: '14px 18px', borderRadius: 10, background: 'var(--info-soft)',
        border: '1px solid color-mix(in srgb, var(--info) 25%, transparent)',
        display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5
      }}>
        <Icon name="sparkles" size={16} style={{ color: 'var(--info)', flexShrink: 0 }} />
        <div>
          <span style={{ fontWeight: 600, color: 'var(--info)' }}>Workforce data will sync from HR records</span>
          <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>
            — link project crew from your site diary to get live headcounts. Currently showing estimated figures.
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Foreign Workers tab ────────────────────────────────────────────────────────
function ForeignWorkersTab() {
  const today = new Date();
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const fmtDoc = (d) => d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  const daysLeft = (d) => Math.round((d - today) / 86400000);

  // Sample foreign worker doc data — will be replaced by /hr/foreign-workers
  const workers = [
    { name: 'Md. Sumon Miah',     nationality: 'Bangladesh', passport: 'AB1234567', permitExpiry: addDays(today, 22),  insuranceExpiry: addDays(today, 80),  medExpiry: addDays(today, 145), site: 'PVDH-T3' },
    { name: 'Nguyen Van Thanh',   nationality: 'Vietnam',    passport: 'VN8765432', permitExpiry: addDays(today, 8),   insuranceExpiry: addDays(today, 30),  medExpiry: addDays(today, 200), site: 'ISKP-2'  },
    { name: 'Ram Kumar Sharma',   nationality: 'Nepal',      passport: 'NP3456789', permitExpiry: addDays(today, 95),  insuranceExpiry: addDays(today, 110), medExpiry: addDays(today, 55),  site: 'PNS-HUB' },
    { name: 'Md. Rahim Uddin',    nationality: 'Bangladesh', passport: 'AB2345678', permitExpiry: addDays(today, 180), insuranceExpiry: addDays(today, 3),   medExpiry: addDays(today, 90),  site: 'PVDH-T3' },
    { name: 'Santhosh Kumar',     nationality: 'India',      passport: 'IN9876543', permitExpiry: addDays(today, 240), insuranceExpiry: addDays(today, 200), medExpiry: addDays(today, 310), site: 'CYB-DC4' },
    { name: 'Ismail Hassan',      nationality: 'Indonesia',  passport: 'ID5678901', permitExpiry: addDays(today, -5),  insuranceExpiry: addDays(today, 45),  medExpiry: addDays(today, 120), site: 'KLCC-EB' },
  ];

  const expiringSoon = workers.filter(w =>
    daysLeft(w.permitExpiry) <= 30 || daysLeft(w.insuranceExpiry) <= 30 || daysLeft(w.medExpiry) <= 30
  ).length;

  const docStatus = (d) => {
    const days = daysLeft(d);
    if (days < 0)   return { tone: 'danger', label: `Expired ${Math.abs(days)}d ago` };
    if (days <= 30) return { tone: 'warn',   label: `${days}d left` };
    return             { tone: 'good',   label: `${days}d left` };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: 'Foreign workers',     value: workers.length, foot: 'registered' },
          { label: 'Expiring ≤ 30 days',  value: expiringSoon,   foot: 'any document',   tone: expiringSoon > 0 ? 'danger' : 'good' },
          { label: 'Nationalities',        value: [...new Set(workers.map(w => w.nationality))].length, foot: 'countries', tone: 'info' },
          { label: 'Expired docs',         value: workers.filter(w => daysLeft(w.permitExpiry) < 0 || daysLeft(w.insuranceExpiry) < 0 || daysLeft(w.medExpiry) < 0).length, foot: 'require renewal', tone: 'danger' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.tone ? `var(--${k.tone})` : 'var(--text)', marginTop: 2 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{k.foot}</div>
          </div>
        ))}
      </div>

      {expiringSoon > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5
        }}>
          <Icon name="alert" size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span>
            <strong style={{ color: 'var(--danger)' }}>{expiringSoon} worker{expiringSoon > 1 ? 's' : ''}</strong>
            <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>
              have documents expiring within 30 days — renew to avoid compliance violations (JTK / FOMEMA).
            </span>
          </span>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Document expiry tracker</h3>
          <span className="page-sub">{workers.length} workers · Work Permit · SOCSO / Insurance · FOMEMA</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary"><Icon name="plus" size={12} /> Add Worker</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Nationality</th>
                <th>Passport</th>
                <th>Work Permit</th>
                <th>Insurance</th>
                <th>FOMEMA</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w, i) => {
                const permit    = docStatus(w.permitExpiry);
                const insurance = docStatus(w.insuranceExpiry);
                const med       = docStatus(w.medExpiry);
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>
                      <span className="pill outline" style={{ fontSize: 10.5 }}>{w.nationality}</span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)' }}>{w.passport}</td>
                    <td>
                      <div>
                        <span className={`pill ${permit.tone}`} style={{ fontSize: 10, padding: '1px 6px' }}>{permit.label}</span>
                        <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>{fmtDoc(w.permitExpiry)}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={`pill ${insurance.tone}`} style={{ fontSize: 10, padding: '1px 6px' }}>{insurance.label}</span>
                        <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>{fmtDoc(w.insuranceExpiry)}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={`pill ${med.tone}`} style={{ fontSize: 10, padding: '1px 6px' }}>{med.label}</span>
                        <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>{fmtDoc(w.medExpiry)}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{w.site}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        padding: '14px 18px', borderRadius: 10, background: 'var(--info-soft)',
        border: '1px solid color-mix(in srgb, var(--info) 25%, transparent)',
        display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5
      }}>
        <Icon name="sparkles" size={16} style={{ color: 'var(--info)', flexShrink: 0 }} />
        <div>
          <span style={{ fontWeight: 600, color: 'var(--info)' }}>Sample data shown</span>
          <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>
            — connect the foreign worker registry via backend to track real passport and permit records.
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Payroll tab ────────────────────────────────────────────────────────────────
function PayrollTab() {
  // Generate last 5 months dynamically
  const now = new Date();
  const months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
    return d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
  });
  const baseGross = 820000;
  const payrollData = months.map((m, i) => ({
    month: m,
    headcount: 580 + i * 8,
    gross: baseGross + i * 15000,
    epf: (baseGross + i * 15000) * 0.13,
    socso: (baseGross + i * 15000) * 0.015,
    eis: (baseGross + i * 15000) * 0.004,
    net: (baseGross + i * 15000) * 0.851,
    status: i < 4 ? 'processed' : 'draft',
  }));
  const fmt = (n) => `RM ${(n / 1000).toFixed(0)}K`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {[
          { label: `${months[4]} gross payroll`, value: fmt(payrollData[4].gross), foot: 'current month estimate', tone: 'accent' },
          { label: 'EPF + SOCSO + EIS',      value: fmt(payrollData[4].epf + payrollData[4].socso + payrollData[4].eis), foot: 'statutory contributions', tone: 'warn' },
          { label: 'Net payout',             value: fmt(payrollData[4].net), foot: '~85.1% of gross' },
          { label: 'Headcount (billed)',     value: payrollData[4].headcount, foot: 'staff on payroll' },
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
          <h3>Payroll history</h3>
          <span className="page-sub">Last 5 months</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary"><Icon name="plus" size={12} /> Run Payroll</button>
          <button className="btn sm ghost"><Icon name="download" size={12} /> Export</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Month</th>
                <th className="tbl-mono">Headcount</th>
                <th className="tbl-mono">Gross</th>
                <th className="tbl-mono">EPF (13%)</th>
                <th className="tbl-mono">SOCSO + EIS</th>
                <th className="tbl-mono">Net Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{p.month}</td>
                  <td className="tbl-mono">{p.headcount}</td>
                  <td className="tbl-mono" style={{ color: 'var(--text)' }}>{fmt(p.gross)}</td>
                  <td className="tbl-mono" style={{ color: 'var(--warn)' }}>{fmt(p.epf)}</td>
                  <td className="tbl-mono" style={{ color: 'var(--warn)' }}>{fmt(p.socso + p.eis)}</td>
                  <td className="tbl-mono" style={{ fontWeight: 700, color: 'var(--good)' }}>{fmt(p.net)}</td>
                  <td>
                    <span className={`pill ${p.status === 'processed' ? 'good' : 'warn'}`} style={{ fontSize: 10.5 }}>
                      {p.status === 'processed' ? 'Processed' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory breakdown notice */}
      <div style={{
        padding: '14px 18px', borderRadius: 10, background: 'var(--warn-soft)',
        border: '1px solid color-mix(in srgb, var(--warn) 25%, transparent)',
        display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5
      }}>
        <Icon name="alert" size={15} style={{ color: 'var(--warn)', flexShrink: 0 }} />
        <div>
          <span style={{ fontWeight: 600, color: 'var(--warn)' }}>Payroll integration coming in Phase 2</span>
          <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>
            — data shown is estimated. Connect your payroll provider or import payslips to get live statutory figures.
          </span>
        </div>
      </div>
    </div>
  );
}
