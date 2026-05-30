import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const statusPill = (s) => {
  const map = {
    draft: 'muted', submitted: 'info', under_review: 'warn',
    certified: 'good', paid: 'good', rejected: 'danger',
    pending: 'warn', overdue: 'danger', partially_paid: 'info',
  };
  return map[s] || 'muted';
};

const fmt    = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TABS = [
  { id: 'cockpit',   label: 'Cockpit',          icon: 'dashboard' },
  { id: 'claims',    label: 'Claims (AR)',       icon: 'doc' },
  { id: 'certs',     label: 'Payment Certs',     icon: 'check' },
  { id: 'retention', label: 'Retention',         icon: 'shield' },
  { id: 'myinvois',  label: 'MyInvois (LHDN)',   icon: 'zap' },
];

export default function FinancePage() {
  const [tab, setTab]   = useState('cockpit');
  const [aging, setAging] = useState(false);
  const qc = useQueryClient();

  const { data: claims = [] } = useQuery({
    queryKey: ['claims'],
    queryFn: () => api.get('/finance/claims').then(r => r.data),
  });
  const { data: certs = [] } = useQuery({
    queryKey: ['payment-certs'],
    queryFn: () => api.get('/finance/payment-certs').then(r => r.data),
  });

  // Only count submitted/certified/paid claims as "billed"
  const billedClaims    = claims.filter(c => !['draft', 'rejected'].includes(c.status));
  const totalClaims     = billedClaims.reduce((s, c) => s + Number(c.amount || 0), 0);
  const paidClaims      = claims.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalCertified  = certs.filter(c => c.status !== 'paid').reduce((s, c) => s + Number(c.certified_amount || 0), 0);
  const overdueCount    = certs.filter(c => c.status === 'overdue').length;

  const refresh = () => {
    qc.invalidateQueries(['claims']);
    qc.invalidateQueries(['payment-certs']);
    qc.invalidateQueries(['notifications']);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-sub">
            Outstanding: <strong style={{ color: 'var(--warn)' }}>{fmt(totalCertified)}</strong>
            {overdueCount > 0 && <span style={{ color: 'var(--danger)', marginLeft: '12px' }}>⚠ {overdueCount} overdue</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn ghost sm" disabled={aging} onClick={async () => {
            setAging(true);
            try {
              const r = await api.post('/finance/run-aging').then(x => x.data);
              refresh();
              alert(`Aging swept: ${r.certsOverdue} cert(s), ${r.invoicesOverdue} invoice(s) now overdue.`);
            } catch (e) { alert(e.response?.data?.error || 'Failed.'); }
            finally { setAging(false); }
          }}>
            <Icon name="clock" size={14} /> {aging ? 'Checking…' : 'Check Overdue'}
          </button>
          <button className="btn primary sm" onClick={() => setTab('claims')}>
            <Icon name="plus" size={14} /> New Claim
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {tab === 'cockpit'   && <CockpitTab claims={claims} certs={certs} totalClaims={totalClaims} paidClaims={paidClaims} totalCertified={totalCertified} overdueCount={overdueCount} />}
        {tab === 'claims'    && <ClaimsTab claims={claims} onRefresh={refresh} />}
        {tab === 'certs'     && <CertsTab certs={certs} onRefresh={refresh} />}
        {tab === 'retention' && <RetentionTab />}
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

// ── Cockpit ──────────────────────────────────────────────────

function CockpitTab({ claims, certs, totalClaims, paidClaims, totalCertified, overdueCount }) {
  const pending = certs.filter(c => c.status === 'pending' || c.status === 'certified').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="kpi-grid">
        {[
          { label: 'Total Billed',  value: `RM ${(totalClaims/1000).toFixed(0)}K`,    icon: 'doc',   sub: `${claims.filter(c=>!['draft','rejected'].includes(c.status)).length} confirmed claims` },
          { label: 'Collected',     value: `RM ${(paidClaims/1000).toFixed(0)}K`,     icon: 'check', sub: 'Fully paid claims', up: true },
          { label: 'Outstanding',   value: `RM ${(totalCertified/1000).toFixed(0)}K`, icon: 'clock', sub: 'Certified, unpaid', up: false },
          { label: 'Overdue Certs', value: String(overdueCount),                       icon: 'alert', sub: overdueCount > 0 ? 'Needs follow-up' : 'All current', up: overdueCount === 0 },
          { label: 'Pending Certs', value: String(pending),                            icon: 'doc',   sub: 'Awaiting payment' },
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

      <div className="card">
        <div className="card-head"><div className="card-title">Recent Claims</div></div>
        <table className="tbl">
          <thead>
            <tr><th>Claim #</th><th>Project</th><th>Type</th><th>Date</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {claims.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><div className="empty-title">No claims yet</div></div></td></tr>
            )}
            {claims.slice(0, 5).map(c => (
              <tr key={c.id}>
                <td className="tbl-mono" style={{ color: 'var(--accent)' }}>{c.claim_number || '—'}</td>
                <td>{c.project_name || '—'}</td>
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

// ── Claims ───────────────────────────────────────────────────

function ClaimsTab({ claims, onRefresh }) {
  const [showNew,  setShowNew]  = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [detail,   setDetail]   = useState(null);
  const [search,   setSearch]   = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [form, setForm] = useState({ claimType: 'progress', claimDate: '', amount: '', description: '', projectId: '', taxRate: '0', notes: '' });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/finance/claims', { ...form });
      setShowNew(false); onRefresh();
      setForm({ claimType: 'progress', claimDate: '', amount: '', description: '', projectId: '', taxRate: '0', notes: '' });
    } catch (err) { alert(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const filtered = claims.filter(c => {
    if (filterProject && c.project_id !== filterProject) return false;
    if (filterStatus  && c.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.claim_number || '').toLowerCase().includes(q) ||
             (c.project_name || '').toLowerCase().includes(q) ||
             (c.description  || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ width: '200px' }} placeholder="Search claims…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input" style={{ width: '160px' }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ width: '140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['draft','submitted','under_review','certified','paid','rejected'].map(s =>
            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn ghost" onClick={() => setShowAuto(true)}>
          <Icon name="zap" size={14} /> Auto Claim
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
            {filtered.length === 0 && (
              <tr><td colSpan={7}><div className="empty" style={{ padding: '40px' }}>
                <Icon name="doc" size={32} style={{ color: 'var(--border-strong)' }} />
                <div className="empty-title">No claims found</div>
                <div className="empty-sub">{claims.length === 0 ? 'Submit your first progress claim' : 'Try adjusting your search or filters'}</div>
                {claims.length === 0 && (
                  <button className="btn primary sm" onClick={() => setShowNew(true)} style={{ marginTop: '12px' }}>
                    <Icon name="plus" size={13} /> New Claim
                  </button>
                )}
              </div></td></tr>
            )}
            {filtered.map(c => (
              <ClaimRow key={c.id} c={c} onRefresh={onRefresh} onDetail={() => setDetail(c.id)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* New claim modal */}
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
                    <option value="invoice">Invoice Claim</option>
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
                  <label className="label">SST / GST</label>
                  <select className="input" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}>
                    <option value="0">No Tax (0%)</option>
                    <option value="6">SST 6%</option>
                    <option value="8">SST 8%</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea rows={2} className="input" style={{ resize: 'vertical' }} placeholder="Work completed this period…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Finance Notes (internal)</label>
                  <textarea rows={2} className="input" style={{ resize: 'vertical' }} placeholder="Internal notes for Finance team…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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

      {/* Claim detail modal */}
      {detail && <ClaimDetailModal claimId={detail} onClose={() => setDetail(null)} onRefresh={onRefresh} />}
    </>
  );
}

const CLAIM_NEXT = {
  draft:        [['submitted',   'Submit']],
  submitted:    [['under_review','Review'], ['rejected','Reject']],
  under_review: [['certified',   'Certify'], ['rejected','Reject']],
  certified:    [['paid',        'Mark Paid']],
};

function ClaimRow({ c, onRefresh, onDetail }) {
  const [busy, setBusy] = useState(false);
  const next = CLAIM_NEXT[c.status] || [];

  const setStatus = async (status) => {
    setBusy(true);
    try { await api.patch(`/finance/claims/${c.id}/status`, { status }); onRefresh(); }
    catch (e) { alert(e.response?.data?.error || 'Failed.'); }
    finally { setBusy(false); }
  };

  const downloadPdf = () => {
    window.open(`${api.defaults.baseURL}/finance/claims/${c.id}/pdf`, '_blank');
  };

  return (
    <tr>
      <td className="tbl-mono">
        <button className="btn-link" onClick={onDetail} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          {c.claim_number || '—'}
        </button>
      </td>
      <td>{c.project_name || '—'}</td>
      <td style={{ textTransform: 'capitalize' }}>
        {c.claim_type}
        {c.source === 'scope' && <span className="pill info" style={{ marginLeft: 6 }}>auto</span>}
      </td>
      <td>{fmtDate(c.claim_date)}</td>
      <td className="tbl-mono">{fmt(c.amount)}</td>
      <td><span className={`pill ${statusPill(c.status)}`}>{c.status}</span></td>
      <td>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {next.map(([s, label]) => (
            <button key={s} className="btn ghost sm" disabled={busy} onClick={() => setStatus(s)}>{label}</button>
          ))}
          <button className="btn ghost sm" title="Download PDF" onClick={downloadPdf}>
            <Icon name="doc" size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ClaimDetailModal({ claimId, onClose, onRefresh }) {
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['claim-detail', claimId],
    queryFn: () => api.get(`/finance/claims/${claimId}`).then(r => r.data),
  });

  const currentNotes = notes !== null ? notes : (data?.notes || '');

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.patch(`/finance/claims/${claimId}/notes`, { notes: currentNotes });
      onRefresh();
    } catch (e) { alert(e.response?.data?.error || 'Failed.'); }
    finally { setSavingNotes(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px', width: '95%' }}>
        <div className="modal-head">
          <span className="modal-title">
            {isLoading ? 'Loading…' : `${data?.claim_number} — ${data?.project_name || ''}`}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {data && (
              <button className="btn ghost sm" onClick={() => window.open(`${api.defaults.baseURL}/finance/claims/${claimId}/pdf`, '_blank')}>
                <Icon name="doc" size={12} /> PDF
              </button>
            )}
            <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>
        <div className="modal-body">
          {isLoading && <p className="page-sub">Loading claim details…</p>}
          {data && (
            <>
              {/* Meta row */}
              <div style={{ display: 'flex', gap: '24px', fontSize: '13px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span><strong>Type:</strong> {data.claim_type}</span>
                <span><strong>Date:</strong> {fmtDate(data.claim_date)}</span>
                <span><strong>Status:</strong> <span className={`pill ${statusPill(data.status)}`}>{data.status}</span></span>
                <span><strong>Submitted by:</strong> {data.submitted_by_name || '—'}</span>
              </div>

              {/* Line items */}
              {data.items && data.items.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Code</th><th>Description</th>
                        <th style={{ textAlign: 'right' }}>Done %</th>
                        <th style={{ textAlign: 'right' }}>Value to Date</th>
                        <th style={{ textAlign: 'right' }}>Prev Claimed</th>
                        <th style={{ textAlign: 'right' }}>This Claim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item, i) => (
                        <tr key={i}>
                          <td className="tbl-mono">{item.item_code || '—'}</td>
                          <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</td>
                          <td className="tbl-mono" style={{ textAlign: 'right' }}>{Number(item.cumulative_pct).toFixed(0)}%</td>
                          <td className="tbl-mono" style={{ textAlign: 'right' }}>{fmt(item.cumulative_value)}</td>
                          <td className="tbl-mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{fmt(item.previous_value)}</td>
                          <td className="tbl-mono" style={{ textAlign: 'right', color: 'var(--accent)' }}>{fmt(item.this_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Manual claim — no scope line items.</p>
              )}

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginTop: '12px', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <span>This Claim: <strong>{fmt(data.amount)}</strong></span>
                {Number(data.tax_amount) > 0 && <span>SST ({data.tax_rate}%): <strong>{fmt(data.tax_amount)}</strong></span>}
                <span>Retention: <strong style={{ color: 'var(--warn)' }}>−{fmt(data.retention_amount)}</strong></span>
                <span>Net Payable: <strong style={{ color: 'var(--good)' }}>{fmt(data.net_amount)}</strong></span>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="label">Finance Notes</label>
                <textarea rows={3} className="input" style={{ resize: 'vertical' }}
                  placeholder="Add internal notes, queries, or advice…"
                  value={currentNotes}
                  onChange={e => setNotes(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
          {data && (
            <button className="btn primary" disabled={savingNotes} onClick={saveNotes}>
              {savingNotes ? 'Saving…' : 'Save Notes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AutoClaimModal({ projects, onClose, onDone }) {
  const [projectId, setProjectId] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxRate,   setTaxRate]   = useState('0');
  const [preview,   setPreview]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

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
      await api.post('/finance/claims/generate', { projectId, claimDate, taxRate: Number(taxRate) });
      onDone();
    } catch (e) { setErr(e.response?.data?.error || 'Failed to generate claim.'); }
    finally { setSaving(false); }
  };

  const taxAmt = preview ? preview.thisClaim * (Number(taxRate) / 100) : 0;
  const net    = preview ? preview.netAmount + taxAmt : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%' }}>
        <div className="modal-head">
          <span className="modal-title">Auto Claim from Progress</span>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 2, minWidth: '160px' }}>
              <label className="label">Project</label>
              <select className="input" value={projectId} onChange={e => loadPreview(e.target.value)}>
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
              <label className="label">Claim Date</label>
              <input type="date" className="input" value={claimDate} onChange={e => setClaimDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
              <label className="label">SST / GST</label>
              <select className="input" value={taxRate} onChange={e => setTaxRate(e.target.value)}>
                <option value="0">No Tax (0%)</option>
                <option value="6">SST 6%</option>
                <option value="8">SST 8%</option>
              </select>
            </div>
          </div>

          {loading && <p className="page-sub">Calculating work done…</p>}
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

          {preview && preview.lines.length > 0 && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ marginTop: '8px' }}>
                  <thead>
                    <tr>
                      <th>Code</th><th>Description</th>
                      <th style={{ textAlign: 'right' }}>Done %</th>
                      <th style={{ textAlign: 'right' }}>Value to Date</th>
                      <th style={{ textAlign: 'right' }}>Prev Claimed</th>
                      <th style={{ textAlign: 'right' }}>This Claim</th>
                    </tr>
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
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginTop: '12px', fontSize: '13px' }}>
                <span>This Claim: <strong>{fmt(preview.thisClaim)}</strong></span>
                {taxAmt > 0 && <span>SST ({taxRate}%): <strong>{fmt(taxAmt)}</strong></span>}
                <span>Retention: <strong style={{ color: 'var(--warn)' }}>−{fmt(preview.retentionAmount)}</strong></span>
                <span>Net Payable: <strong style={{ color: 'var(--good)' }}>{fmt(net)}</strong></span>
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

// ── Payment Certs ────────────────────────────────────────────

function CertsTab({ certs, onRefresh }) {
  const [busy,           setBusy]          = useState(null);
  const [partialCert,    setPartialCert]   = useState(null);
  const [partialAmt,     setPartialAmt]    = useState('');
  const [partialSaving,  setPartialSaving] = useState(false);
  const [editCert,       setEditCert]      = useState(null);
  const [search,         setSearch]        = useState('');
  const [filterStatus,   setFilterStatus]  = useState('');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) });
  const [filterProject, setFilterProject] = useState('');

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
    try { await api.post(`/finance/payment-certs/${id}/invoice`); onRefresh(); alert('Invoice created. See the Invoicing module.'); }
    catch (e) { alert(e.response?.data?.error || 'Failed.'); }
    finally { setBusy(null); }
  };

  const submitPartial = async () => {
    if (!partialAmt || Number(partialAmt) <= 0) return;
    setPartialSaving(true);
    try {
      await api.post(`/finance/payment-certs/${partialCert.id}/partial`, { amountPaid: partialAmt });
      setPartialCert(null); setPartialAmt(''); onRefresh();
    } catch (e) { alert(e.response?.data?.error || 'Failed.'); }
    finally { setPartialSaving(false); }
  };

  const filtered = certs.filter(c => {
    if (filterProject && c.project_id !== filterProject) return false;
    if (filterStatus  && c.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.cert_number || '').toLowerCase().includes(q) ||
             (c.project_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ width: '200px' }} placeholder="Search certs…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input" style={{ width: '160px' }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ width: '140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['pending','certified','partially_paid','paid','overdue'].map(s =>
            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {filtered.length === 0 && certs.length === 0 ? (
        <div className="empty" style={{ minHeight: '300px' }}>
          <Icon name="doc" size={36} style={{ color: 'var(--border-strong)' }} />
          <div className="empty-title">No payment certificates</div>
          <div className="empty-sub">Certs are generated when a claim is certified</div>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr><th>Cert #</th><th>Project</th><th>Certified</th><th>Paid</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty" style={{ padding: '24px' }}><div className="empty-title">No certs match filters</div></div></td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id}>
                  <td className="tbl-mono" style={{ color: 'var(--accent)' }}>{c.cert_number || '—'}</td>
                  <td>{c.project_name || '—'}</td>
                  <td className="tbl-mono">{fmt(c.certified_amount)}</td>
                  <td className="tbl-mono" style={{ color: Number(c.amount_paid) > 0 ? 'var(--good)' : 'var(--text-dim)' }}>
                    {Number(c.amount_paid) > 0 ? fmt(c.amount_paid) : '—'}
                  </td>
                  <td style={{ color: c.status === 'overdue' ? 'var(--danger)' : undefined }}>{fmtDate(c.due_date)}</td>
                  <td><span className={`pill ${statusPill(c.status)}`}>{c.status.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {c.status !== 'paid' && <>
                        <button className="btn ghost sm" disabled={busy === c.id} onClick={() => setStatus(c.id, 'paid')}>Mark Paid</button>
                        <button className="btn ghost sm" disabled={busy === c.id} onClick={() => { setPartialCert(c); setPartialAmt(''); }}>Partial</button>
                        <button className="btn ghost sm" disabled={busy === c.id} title="Edit cert" onClick={() => setEditCert(c)}>Edit</button>
                      </>}
                      {c.invoiced
                        ? <span className="pill good">invoiced</span>
                        : <button className="btn ghost sm" disabled={busy === c.id} onClick={() => createInvoice(c.id)}>
                            <Icon name="doc" size={12} /> Invoice
                          </button>}
                      <button className="btn ghost sm" title="Download PDF"
                        onClick={() => window.open(`${api.defaults.baseURL}/finance/payment-certs/${c.id}/pdf`, '_blank')}>
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Partial payment modal */}
      {partialCert && (
        <div className="modal-overlay" onClick={() => setPartialCert(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-head">
              <span className="modal-title">Partial Payment — {partialCert.cert_number}</span>
              <button className="icon-btn" onClick={() => setPartialCert(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '12px' }}>
                Certified: <strong>{fmt(partialCert.certified_amount)}</strong> &nbsp;|&nbsp;
                Paid so far: <strong>{fmt(partialCert.amount_paid)}</strong> &nbsp;|&nbsp;
                Remaining: <strong style={{ color: 'var(--warn)' }}>{fmt(Number(partialCert.certified_amount) - Number(partialCert.amount_paid))}</strong>
              </p>
              <div className="form-group">
                <label className="label">Amount Received (RM)</label>
                <input type="number" className="input" min="0.01" step="0.01" placeholder="0.00"
                  value={partialAmt} onChange={e => setPartialAmt(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setPartialCert(null)}>Cancel</button>
              <button className="btn primary" disabled={partialSaving || !partialAmt} onClick={submitPartial}>
                {partialSaving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit cert modal */}
      {editCert && (
        <EditCertModal cert={editCert} onClose={() => setEditCert(null)} onDone={() => { setEditCert(null); onRefresh(); }} />
      )}
    </>
  );
}

function EditCertModal({ cert, onClose, onDone }) {
  const [certifiedAmount, setCertifiedAmount] = useState(String(cert.certified_amount));
  const [notes,           setNotes]           = useState(cert.notes || '');
  const [saving,          setSaving]          = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/finance/payment-certs/${cert.id}`, {
        certifiedAmount: Number(certifiedAmount),
        notes: notes || null,
      });
      onDone();
    } catch (e) { alert(e.response?.data?.error || 'Failed.'); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-head">
          <span className="modal-title">Edit Cert — {cert.cert_number}</span>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="label">Certified Amount (RM)</label>
            <input type="number" className="input" min="0" step="0.01"
              value={certifiedAmount} onChange={e => setCertifiedAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Finance Notes</label>
            <textarea rows={3} className="input" style={{ resize: 'vertical' }}
              placeholder="Adjustment reason, client dispute details…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Retention ────────────────────────────────────────────────

function RetentionTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['retention'],
    queryFn: () => api.get('/finance/retention').then(r => r.data),
  });

  const totalHeld = data.reduce((s, r) => s + Number(r.retention_held || 0), 0);

  if (isLoading) return <p className="page-sub" style={{ padding: '24px' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary */}
      <div className="kpi-grid">
        <div className="kpi">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="kpi-label">Total Retention Held</span>
            <Icon name="shield" size={14} style={{ color: 'var(--text-mute)' }} />
          </div>
          <div className="kpi-value">{fmt(totalHeld)}</div>
          <div className="kpi-foot"><span style={{ color: 'var(--text-dim)' }}>Across {data.filter(r => Number(r.retention_held) > 0).length} project(s)</span></div>
        </div>
        <div className="kpi">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="kpi-label">Retention Release</span>
            <Icon name="clock" size={14} style={{ color: 'var(--text-mute)' }} />
          </div>
          <div className="kpi-value" style={{ fontSize: '16px', color: 'var(--text-dim)' }}>Phase 2</div>
          <div className="kpi-foot"><span style={{ color: 'var(--text-dim)' }}>Automated release coming soon</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Retention by Project</div></div>
        {data.length === 0 ? (
          <div className="empty" style={{ padding: '40px' }}>
            <div className="empty-title">No retention data</div>
            <div className="empty-sub">Submit claims on projects with retention % set</div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Project</th>
                <th style={{ textAlign: 'right' }}>Retention %</th>
                <th style={{ textAlign: 'right' }}>Claims</th>
                <th style={{ textAlign: 'right' }}>Retention Held</th>
                <th>Release Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.project_id}>
                  <td>{r.project_name}</td>
                  <td className="tbl-mono" style={{ textAlign: 'right' }}>{Number(r.retention_percentage).toFixed(1)}%</td>
                  <td className="tbl-mono" style={{ textAlign: 'right' }}>{r.claim_count}</td>
                  <td className="tbl-mono" style={{ textAlign: 'right', color: Number(r.retention_held) > 0 ? 'var(--warn)' : 'var(--text-dim)' }}>
                    {fmt(r.retention_held)}
                  </td>
                  <td><span className="pill muted">Pending release</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
