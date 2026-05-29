import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const STATUS_PILL = {
  active: 'good', on_hold: 'warn', completed: 'info',
  cancelled: 'danger', delayed: 'danger',
};

const STATUS_LABELS = {
  active: 'Active', on_hold: 'On Hold', completed: 'Completed',
  cancelled: 'Cancelled', delayed: 'Delayed',
};

const TABS = [
  { id: 'portfolio', label: 'Portfolio',       icon: 'building' },
  { id: 'kanban',    label: 'Kanban',           icon: 'flow' },
  { id: 'cashflow',  label: 'Cashflow',         icon: 'money' },
  { id: 'resources', label: 'Resources',        icon: 'users' },
  { id: 'risks',     label: 'Risks',            icon: 'alert' },
];

const fmt = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return `RM ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `RM ${(v / 1_000).toFixed(0)}K`;
  return `RM ${v.toFixed(0)}`;
};

export default function ProjectsPage() {
  const [tab, setTab] = useState('portfolio');
  const [showNew, setShowNew] = useState(false);
  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const active    = projects.filter(p => p.status === 'active').length;
  const totalVal  = projects.reduce((s, p) => s + parseFloat(p.contract_value || p.contract_sum || 0), 0);
  const delayed   = projects.filter(p => p.status === 'delayed').length;

  return (
    <>
      {/* Page header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">
            {projects.length} total · {active} active · Portfolio {fmt(totalVal)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn ghost sm"><Icon name="filter" size={14} /> Filter</button>
          <button className="btn primary sm" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={14} /> New Project
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: '32px' }}>
        {[
          { label: 'Active',     value: active,              color: 'var(--good)' },
          { label: 'Total',      value: projects.length,     color: 'var(--text)' },
          { label: 'Delayed',    value: delayed,             color: delayed > 0 ? 'var(--danger)' : 'var(--text-dim)' },
          { label: 'Portfolio',  value: fmt(totalVal),       color: 'var(--accent)', mono: true },
        ].map(k => (
          <div key={k.label}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: k.color, fontFamily: k.mono ? 'JetBrains Mono, monospace' : undefined, marginTop: '2px' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {tab === 'portfolio' && (
          <PortfolioTab projects={projects} isLoading={isLoading} onNew={() => setShowNew(true)} />
        )}
        {tab === 'kanban' && (
          <KanbanTab projects={projects} />
        )}
        {tab === 'cashflow'  && <ComingSoon label="Project Cashflow" icon="money" />}
        {tab === 'resources' && <ComingSoon label="Resources" icon="users" />}
        {tab === 'risks'     && <ComingSoon label="Risk Register" icon="alert" />}
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

function ComingSoon({ label, icon }) {
  return (
    <div className="empty" style={{ minHeight: '300px' }}>
      <Icon name={icon} size={36} style={{ color: 'var(--border-strong)' }} />
      <div className="empty-title">{label}</div>
      <div className="empty-sub">Coming in the next sprint</div>
    </div>
  );
}

function PortfolioTab({ projects, isLoading, onNew }) {
  if (isLoading) return <div style={{ color: 'var(--text-mute)', fontSize: 'var(--font-sm)' }}>Loading…</div>;
  if (projects.length === 0) {
    return (
      <div className="empty" style={{ minHeight: '300px' }}>
        <Icon name="building" size={36} style={{ color: 'var(--border-strong)' }} />
        <div className="empty-title">No projects yet</div>
        <div className="empty-sub">Create your first project to get started</div>
        <button className="btn primary sm" onClick={onNew} style={{ marginTop: '12px' }}>
          <Icon name="plus" size={13} /> Create First Project
        </button>
      </div>
    );
  }
  return (
    <div className="card">
      <table className="tbl">
        <thead>
          <tr>
            <th>Project</th><th>Client</th><th>Status</th>
            <th>Contract Value</th><th>Progress</th><th>PM</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(p => {
            const pct = parseFloat(p.progress_pct || p.completion_pct || 0);
            const pillCls = STATUS_PILL[p.status] || 'muted';
            return (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {p.project_number || p.project_code || '—'}
                  </div>
                </td>
                <td>{p.client_name || '—'}</td>
                <td>
                  <span className={`pill ${pillCls}`}>
                    {STATUS_LABELS[p.status] || p.status || '—'}
                  </span>
                </td>
                <td className="tbl-mono">{fmt(p.contract_value || p.contract_sum)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct >= 80 ? 'var(--good)' : pct >= 40 ? 'var(--accent)' : 'var(--warn)',
                        borderRadius: '99px',
                      }} />
                    </div>
                    <span className="tbl-mono" style={{ minWidth: '30px', color: 'var(--text-dim)' }}>{pct}%</span>
                  </div>
                </td>
                <td>{p.pm_name || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KanbanTab({ projects }) {
  const statuses = ['active', 'on_hold', 'completed', 'cancelled'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {statuses.map(s => {
        const col = projects.filter(p => p.status === s);
        return (
          <div key={s}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-2)', textTransform: 'capitalize' }}>
                {STATUS_LABELS[s]}
              </span>
              <span className={`pill ${STATUS_PILL[s] || 'muted'}`}>{col.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {col.length === 0 && (
                <div style={{ padding: '20px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--text-mute)', fontSize: 'var(--font-xs)' }}>
                  No projects
                </div>
              )}
              {col.map(p => (
                <div key={p.id} className="card" style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'var(--text)', marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {p.project_number || '—'}
                  </div>
                  {(p.contract_value || p.contract_sum) && (
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-dim)', marginTop: '6px' }}>
                      {fmt(p.contract_value || p.contract_sum)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contractSum: '', startDate: '', endDate: '', description: '' });

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/projects', form);
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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">New Project</span>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="label">Project Name *</label>
              <input className="input" placeholder="e.g. Jalan Binaan Resurfacing Phase 1" {...f('name')} required />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea rows={2} className="input" style={{ resize: 'vertical' }} placeholder="Brief project description…" {...f('description')} />
            </div>
            <div className="form-group">
              <label className="label">Contract Sum (RM)</label>
              <input type="number" className="input" placeholder="e.g. 500000" {...f('contractSum')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
