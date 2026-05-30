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
          <ClaimsTab claims={claims} onRefresh={() => { qc.invalidateQueries(['claims']); qc.invalidateQueries(['payment-certs']); }} />
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
  const [showAuto, setShowAuto] = useState(false);
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
        <button className="btn ghost" onClick={() => setShowAuto(true)}>
          <Icon name="zap" size={14} /> Auto Claim (from progress)
        </button>
        <button className="btn primary" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={14} /> New Claim
        </button>
      </div>

      {showAuto && (
        <AutoClaimModal projects={projects} onClose={() => setShowAuto(false)} onDone={() => { setShowAuto(false); onRefresh(); }} />
      )}

      <div className="card">
        <table className="tbl">
          <thead>
            <tr><th>Claim #</th><th>Project</th><th>Type</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {claims.length === 0 && (
              <tr><td colSpan={7}><div className="empty" style={{ padding: '40px' }}>
                <Icon name="doc" size={32} style={{ color: 'var(--border-strong)' }} />
                <div className="empty-title">No claims yet</div>
                <div className="empty-sub">Submit your first progress claim</div>
                <button className="btn primary sm" onClick={() => setShowNew(true)} style={{ marginTop: '12px' }}>
                  <Icon name="plus" size={13} /> New Claim
                </button>
              </div></td></tr>
            )}
            {claims.map(c => <ClaimRow key={c.id} c={c} onRefresh={onRefresh} />)}
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

// Claim row with status workflow: submitted → under_review → certified (auto-creates cert) → paid.
const CLAIM_NEXT = {
  draft: [['submitted', 'Submit']],
  submitted: [['under_review', 'Review'], ['rejected', 'Reject']],
  under_review: [['certified', 'Certify'], ['rejected', 'Reject']],
  certified: [['paid', 'Mark Paid']],
};
function ClaimRow({ c, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const next = CLAIM_NEXT[c.status] || [];
  const setStatus = async (status) => {
    setBusy(true);
    try { await api.patch(`/finance/claims/${c.id}/status`, { status }); onRefresh(); }
    catch (e) { alert(e.response?.data?.error || 'Failed.'); }
    finally { setBusy(false); }
  };
  return (
    <tr>
      <td className="tbl-mono" style={{ color: 'var(--accent)' }}>{c.claim_number || '—'}</td>
      <td style={{ color: 'var(--text)' }}>{c.project_name || '—'}</td>
      <td style={{ textTransform: 'capitalize' }}>{c.claim_type}{c.source === 'scope' && <span className="pill info" style={{ marginLeft: 6 }}>auto</span>}</td>
      <td>{fmtDate(c.claim_date)}</td>
      <td className="tbl-mono">{fmt(c.amount)}</td>
      <td><span className={`pill ${statusPill(c.status)}`}>{c.status}</span></td>
      <td>
        <div style={{ display: 'flex', gap: '6px' }}>
          {next.map(([s, label]) => (
            <button key={s} className="btn ghost sm" disabled={busy} onClick={() => setStatus(s)}>{label}</button>
          ))}
        </div>
      </td>
    </tr>
  );
}

// Build a progress claim from BQ scope work-done-to-date.
function AutoClaimModal({ projects, onClose, onDone }) {
  const [projectId, setProjectId] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const loadPreview = async (pid) => {
    setProjectId(pid); setPreview(null); setErr('');
    if (!pid) return;
    setLoading(true);
    try {
      const data = await api.get(`/finance/claims/preview/${pid}`).then(r => r.data);
      setPreview(data);
      if (!data.lines.length) setErr('No scope progress to claim. Import a BQ and record site-diary progress first.');
    } catch (e) { setErr(e.response?.data?.error || 'Failed to load preview.'); }
    finally { setLoading(false); }
  };

  const generate = async () => {
    setSaving(true); setErr('');
    try {
      await api.post('/finance/claims/generate', { projectId, claimDate });
      onDone();
    } catch (e) { setErr(e.response?.data?.error || 'Failed to generate claim.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px', width: '90%' }}>
        <div className="modal-head">
          <span className="modal-title">Auto Claim from Progress</span>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="label">Project</label>
              <select className="input" value={projectId} onChange={e => loadPreview(e.target.value)}>
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Claim Date</label>
              <input type="date" className="input" value={claimDate} onChange={e => setClaimDate(e.target.value)} />
            </div>
          </div>

          {loading && <p className="page-sub">Calculating work done…</p>}
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

          {preview && preview.lines.length > 0 && (
            <>
              <table className="tbl" style={{ marginTop: '8px' }}>
                <thead>
                  <tr><th>Code</th><th>Description</th><th style={{ textAlign: 'right' }}>Done %</th><th style={{ textAlign: 'right' }}>Value to date</th><th style={{ textAlign: 'right' }}>Previously claimed</th><th style={{ textAlign: 'right' }}>This claim</th></tr>
                </thead>
                <tbody>
                  {preview.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="tbl-mono">{l.itemCode || '—'}</td>
                      <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.description}</td>
                      <td className="tbl-mono" style={{ textAlign: 'right' }}>{Number(l.cumulativePct).toFixed(0)}%</td>
                      <td className="tbl-mono" style={{ textAlign: 'right' }}>{fmt(l.cumulativeValue)}</td>
                      <td className="tbl-mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{fmt(l.previousValue)}</td>
                      <td className="tbl-mono" style={{ textAlign: 'right', color: 'var(--accent)' }}>{fmt(l.thisValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginTop: '12px', fontSize: '13px' }}>
                <span>This claim: <strong>{fmt(preview.thisClaim)}</strong></span>
                <span>Retention: <strong style={{ color: 'var(--warn)' }}>−{fmt(preview.retentionAmount)}</strong></span>
                <span>Net payable: <strong style={{ color: 'var(--good)' }}>{fmt(preview.netAmount)}</strong></span>
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving || !preview || preview.thisClaim <= 0} onClick={generate}>
            {saving ? 'Generating…' : 'Generate Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CertsTab({ certs, onRefresh }) {
  const [busy, setBusy] = useState(null);

  const setStatus = async (id, status) => {
    setBusy(id);
    try {
      await api.patch(`/finance/payment-certs/${id}`, { status, paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : null });
      onRefresh();
    } catch (e) { alert(e.response?.data?.error || 'Failed.'); }
    finally { setBusy(null); }
  };

  const createInvoice = async (id) => {
    setBusy(id);
    try {
      await api.post(`/finance/payment-certs/${id}/invoice`);
      onRefresh();
      alert('Invoice created. See the Invoicing module.');
    } catch (e) { alert(e.response?.data?.error || 'Failed.'); }
    finally { setBusy(null); }
  };

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
          <tr><th>Cert #</th><th>Project</th><th>Certified Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {certs.map(c => (
            <tr key={c.id}>
              <td className="tbl-mono" style={{ color: 'var(--accent)' }}>{c.cert_number || '—'}</td>
              <td style={{ color: 'var(--text)' }}>{c.project_name || '—'}</td>
              <td className="tbl-mono">{fmt(c.certified_amount)}</td>
              <td>{fmtDate(c.due_date)}</td>
              <td><span className={`pill ${statusPill(c.status)}`}>{c.status}</span></td>
              <td>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {c.status !== 'paid' && (
                    <button className="btn ghost sm" disabled={busy === c.id} onClick={() => setStatus(c.id, 'paid')}>Mark Paid</button>
                  )}
                  {c.invoiced
                    ? <span className="pill good">invoiced</span>
                    : <button className="btn ghost sm" disabled={busy === c.id} onClick={() => createInvoice(c.id)}>
                        <Icon name="doc" size={12} /> Create Invoice
                      </button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
