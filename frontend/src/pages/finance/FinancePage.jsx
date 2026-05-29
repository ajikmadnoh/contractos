import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const statusPill = (s) => {
  const map = {
    draft: 'muted', submitted: 'info', under_review: 'warn',
    certified: 'good', paid: 'good', rejected: 'danger',
    pending: 'warn', overdue: 'danger',
  };
  return map[s] || 'muted';
};

const fmt = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TABS = [
  { id: 'cockpit',   label: 'Cockpit',           icon: 'dashboard' },
  { id: 'claims',    label: 'Claims (AR)',        icon: 'doc' },
  { id: 'certs',     label: 'Payment Certs',      icon: 'check' },
  { id: 'retention', label: 'Retention & Bonds',  icon: 'shield' },
  { id: 'myinvois',  label: 'MyInvois (LHDN)',    icon: 'zap' },
];

export default function FinancePage() {
  const [tab, setTab] = useState('cockpit');
  const qc = useQueryClient();

  const { data: claims = [] } = useQuery({
    queryKey: ['claims'],
    queryFn: () => api.get('/finance/claims').then(r => r.data),
  });

  const { data: certs = [] } = useQuery({
    queryKey: ['payment-certs'],
    queryFn: () => api.get('/finance/payment-certs').then(r => r.data),
  });

  const totalCertified = certs.filter(c => c.status !== 'paid').reduce((s, c) => s + Number(c.certified_amount || 0), 0);
  const overdueCount   = certs.filter(c => c.status === 'overdue').length;
  const totalClaims    = claims.reduce((s, c) => s + Number(c.amount || 0), 0);
  const paidClaims     = claims.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0);

  return (
    <>
      {/* Page header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-sub">
            Outstanding: <strong style={{ color: 'var(--warn)' }}>{fmt(totalCertified)}</strong>
            {overdueCount > 0 && <span style={{ color: 'var(--danger)', marginLeft: '12px' }}>⚠ {overdueCount} overdue</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn ghost sm"><Icon name="download" size={14} /> Export</button>
          <button className="btn primary sm" onClick={() => setTab('claims')}>
            <Icon name="plus" size={14} /> New Claim
          </button>
        </div>
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
        {tab === 'cockpit' && (
          <CockpitTab claims={claims} certs={certs} totalClaims={totalClaims} paidClaims={paidClaims} totalCertified={totalCertified} overdueCount={overdueCount} />
        )}
        {tab === 'claims' && (
          <ClaimsTab claims={claims} onRefresh={() => qc.invalidateQueries(['claims'])} />
        )}
        {tab === 'certs' && (
          <CertsTab certs={certs} onRefresh={() => qc.invalidateQueries(['payment-certs'])} />
        )}
        {tab === 'retention' && <ComingSoon label="Retention & Bonds" icon="shield" />}
        {tab === 'myinvois'  && <ComingSoon label="MyInvois (LHDN e-invoicing)" icon="zap" />}
      </div>
    </>
  );
}

function ComingSoon({ label, icon }) {
  return (
    <div className="empty" style={{ minHeight: '300px' }}>
      <Icon name={icon} size={36} style={{ color: 'var(--border-strong)' }} />
      <div className="empty-title">{label}</div>
      <div className="empty-sub">This module is coming in the next sprint</div>
    </div>
  );
}

function CockpitTab({ claims, certs, totalClaims, paidClaims, totalCertified, overdueCount }) {
  const pending = certs.filter(c => c.status === 'pending' || c.status === 'certified').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI strip */}
      <div className="kpi-grid">
        {[
          { label: 'Total Billed',        value: `RM ${(totalClaims/1000).toFixed(0)}K`,    icon: 'doc',    sub: `${claims.length} claims submitted` },
          { label: 'Collected',           value: `RM ${(paidClaims/1000).toFixed(0)}K`,     icon: 'check',  sub: 'Fully paid claims', up: true },
          { label: 'Outstanding',         value: `RM ${(totalCertified/1000).toFixed(0)}K`, icon: 'clock',  sub: 'Certified, unpaid', up: false },
          { label: 'Overdue Certs',       value: String(overdueCount),                       icon: 'alert',  sub: overdueCount > 0 ? 'Needs follow-up' : 'All current', up: overdueCount === 0 },
          { label: 'Pending Certs',       value: String(pending),                            icon: 'doc',    sub: 'Awaiting payment' },
        ].map(k => (
          <div key={k.label} className="kpi">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="kpi-label">{k.label}</span>
              <Icon name={k.icon} size={14} style={{ color: 'var(--text-mute)' }} />
            </div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-foot">
              {k.up !== undefined && (
                <Icon name={k.up ? 'arrowU' : 'arrowD'} size={11}
                  style={{ color: k.up ? 'var(--good)' : 'var(--danger)' }} />
              )}
              <span style={{ color: k.up === true ? 'var(--good)' : k.up === false ? 'var(--danger)' : 'var(--text-dim)' }}>
                {k.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent claims */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Recent Claims</div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Claim #</th><th>Project</th><th>Type</th><th>Date</th><th>Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><div className="empty-title">No claims yet</div></div></td></tr>
            )}
            {claims.slice(0, 5).map(c => (
              <tr key={c.id}>
                <td className="tbl-mono" style={{ color: 'var(--accent)' }}>{c.claim_number || '—'}</td>
                <td style={{ color: 'var(--text)' }}>{c.project_name || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{c.claim_type}</td>
                <td>{fmtDate(c.claim_date)}</td>
                <td className="tbl-mono">{fmt(c.amount)}</td>
                <td><span className={`pill ${statusPill(c.status)}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClaimsTab({ claims, onRefresh }) {
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ claimType: 'progress', claimDate: '', amount: '', description: '', projectId: '' });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/finance/claims', { ...form });
      setShowNew(false); onRefresh();
      setForm({ claimType: 'progress', claimDate: '', amount: '', description: '', projectId: '' });
    } catch (err) { alert(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn primary" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={14} /> New Claim
        </button>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr><th>Claim #</th><th>Project</th><th>Type</th><th>Date</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {claims.length === 0 && (
              <tr><td colSpan={6}><div className="empty" style={{ padding: '40px' }}>
                <Icon name="doc" size={32} style={{ color: 'var(--border-strong)' }} />
                <div className="empty-title">No claims yet</div>
                <div className="empty-sub">Submit your first progress claim</div>
                <button className="btn primary sm" onClick={() => setShowNew(true)} style={{ marginTop: '12px' }}>
                  <Icon name="plus" size={13} /> New Claim
                </button>
              </div></td></tr>
            )}
            {claims.map(c => (
              <tr key={c.id}>
                <td className="tbl-mono" style={{ color: 'var(--accent)' }}>{c.claim_number || '—'}</td>
                <td style={{ color: 'var(--text)' }}>{c.project_name || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{c.claim_type}</td>
                <td>{fmtDate(c.claim_date)}</td>
                <td className="tbl-mono">{fmt(c.amount)}</td>
                <td><span className={`pill ${statusPill(c.status)}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">New Claim</span>
              <button className="icon-btn" onClick={() => setShowNew(false)}><Icon name="x" size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Project</label>
                  <select className="input" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required>
                    <option value="">Select project…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Claim Type</label>
                  <select className="input" value={form.claimType} onChange={e => setForm(f => ({ ...f, claimType: e.target.value }))}>
                    <option value="progress">Progress Claim</option>
                    <option value="full">Full Claim (Final)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Claim Date</label>
                  <input type="date" className="input" value={form.claimDate} onChange={e => setForm(f => ({ ...f, claimDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="label">Amount (RM)</label>
                  <input type="number" className="input" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea rows={3} className="input" style={{ resize: 'vertical' }} placeholder="Work completed this period…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function CertsTab({ certs }) {
  if (certs.length === 0) {
    return (
      <div className="empty" style={{ minHeight: '300px' }}>
        <Icon name="doc" size={36} style={{ color: 'var(--border-strong)' }} />
        <div className="empty-title">No payment certificates</div>
        <div className="empty-sub">Certs are generated when a claim is certified by the client</div>
      </div>
    );
  }
  return (
    <div className="card">
      <table className="tbl">
        <thead>
          <tr><th>Cert #</th><th>Project</th><th>Certified Amount</th><th>Due Date</th><th>Status</th></tr>
        </thead>
        <tbody>
          {certs.map(c => (
            <tr key={c.id}>
              <td className="tbl-mono" style={{ color: 'var(--accent)' }}>{c.cert_number || '—'}</td>
              <td style={{ color: 'var(--text)' }}>{c.project_name || '—'}</td>
              <td className="tbl-mono">{fmt(c.certified_amount)}</td>
              <td>{fmtDate(c.due_date)}</td>
              <td><span className={`pill ${statusPill(c.status)}`}>{c.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
