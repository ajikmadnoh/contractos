import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const fmtRM = (n) => 'RM ' + Number(n || 0).toLocaleString('en-MY', { maximumFractionDigits: 0 });
const fmtShort = (n) => {
  n = Number(n || 0);
  if (n >= 1e9) return 'RM ' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return 'RM ' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return 'RM ' + (n / 1e3).toFixed(1) + 'k';
  return 'RM ' + n;
};

const STATUS_PILL = { draft: 'outline', submitted: 'warn', approved: 'good', archived: 'muted' };

// ── AI scope-extraction card ────────────────────────────────────────────────────
function AIScopeCard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [createdBQ, setCreatedBQ] = useState(null);
  const [error, setError] = useState(null);

  const ex = createdBQ?.extraction;
  const stages = [
    { step: 2, label: 'OCR & section detection', detail: ex ? `${ex.pages || 0} page${ex.pages === 1 ? '' : 's'} · ${ex.sectionCount || 0} section${ex.sectionCount === 1 ? '' : 's'} found` : null },
    { step: 3, label: 'BQ scope extraction', detail: ex ? `${ex.itemCount || 0} line item${ex.itemCount === 1 ? '' : 's'} extracted` : null },
    { step: 4, label: ex?.total ? 'Quantity & rate parsing' : 'Unit & rate parsing', detail: ex ? (ex.total ? `${fmtRM(ex.total)} estimated total` : 'Rate schedule — add quantities to price') : null },
    { step: 5, label: 'Draft BQ assembled', detail: ex && ex.itemCount === 0 ? 'No priced rows detected — start manually' : `Ready to review${ex?.viaOcr ? ' · via OCR' : ''}` },
  ];

  useEffect(() => {
    if (step < 2 || step >= 5) return;
    const id = setTimeout(() => setStep(s => s + 1), 900);
    return () => clearTimeout(id);
  }, [step]);

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f); setError(null); setStep(1);
    const fd = new FormData();
    fd.append('file', f);
    try {
      const res = await api.post('/bq/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCreatedBQ(res.data); setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.'); setStep(0); setFile(null);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
  const reset = () => { setStep(0); setFile(null); setCreatedBQ(null); setError(null); };
  const fmtSize = (b) => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';

  return (
    <div className="card rise rise-1" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--blueprint)', opacity: .35, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div className="card-head">
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="ai" size={14} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-title">AI scope extraction</div>
            <div className="card-sub">Drop a tender PDF — Copilot extracts BQ scope, deadlines and risks</div>
          </div>
          <span className="pill accent">Beta</span>
        </div>
        <div className="card-body">
          {step === 0 ? (
            <>
              {error && <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--danger)', background: 'var(--danger-soft)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ display: 'block', width: '100%', border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 12, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)', transition: 'all .15s' }}>
                <input type="file" accept=".pdf,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Icon name="paperclip" size={20} /></div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Drop tender PDF here</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>or click to browse · Max 80MB · BQ-tab Excel also supported</div>
              </label>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="doc" size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{file ? fmtSize(file.size) : ''} · {step === 1 ? 'Uploading…' : 'uploaded'}</div>
                </div>
                {step >= 2 && <Icon name="check" size={16} style={{ color: 'var(--good)', flexShrink: 0 }} />}
              </div>
              {step >= 2 && stages.map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: step > s.step ? 'var(--good)' : step === s.step ? 'var(--accent)' : 'var(--bg-2)', color: step >= s.step ? 'white' : 'var(--text-mute)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                    {step > s.step ? <Icon name="check" size={12} /> : step === s.step ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', animation: 'pulse 1s infinite' }} /> : s.step - 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: step === s.step ? 600 : 500, color: step < s.step ? 'var(--text-mute)' : 'var(--text)' }}>{s.label}</div>
                    {step >= s.step && s.detail && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.detail}</div>}
                  </div>
                </div>
              ))}
              {step >= 5 && ex?.warning && (
                <div style={{ fontSize: 11.5, color: 'var(--warn)', background: 'var(--warn-soft, rgba(216,130,0,.1))', padding: '8px 12px', borderRadius: 8, lineHeight: 1.4 }}>{ex.warning}</div>
              )}
              {step >= 5 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onComplete(createdBQ)}>
                    <Icon name="check" size={14} /> Open as new BQ
                  </button>
                  <button className="btn" onClick={reset}>Reset</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status funnel ───────────────────────────────────────────────────────────────
function StatusFunnel({ bqs }) {
  const order = [
    { key: 'draft', label: 'Draft', color: 'var(--text-mute)' },
    { key: 'submitted', label: 'Submitted', color: 'var(--warn)' },
    { key: 'approved', label: 'Approved', color: 'var(--good)' },
    { key: 'archived', label: 'Archived', color: 'var(--text-dim)' },
  ];
  const rows = order.map(o => {
    const list = bqs.filter(b => (b.status || 'draft') === o.key);
    return { ...o, count: list.length, value: list.reduce((s, b) => s + Number(b.total_amount || 0), 0) };
  });
  const totalValue = bqs.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const max = Math.max(1, ...rows.map(r => r.value), totalValue * 0.4);

  return (
    <div className="card rise rise-2">
      <div className="card-head">
        <div>
          <div className="card-title">BQ pipeline</div>
          <div className="card-sub">{bqs.length} document{bqs.length !== 1 ? 's' : ''} · {fmtShort(totalValue)} estimated</div>
        </div>
        <div style={{ flex: 1 }} />
        <span className="pill accent"><Icon name="trend" size={10} /> {bqs.filter(b => b.status === 'approved').length} approved</span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(r => {
          const w = Math.min(100, (r.value / max) * 100);
          return (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 90, fontSize: 12, fontWeight: 500 }}>{r.label}</div>
              <div style={{ flex: 1, height: 36, borderRadius: 8, background: 'var(--bg-2)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(w, r.count > 0 ? 18 : 0)}%`, height: '100%', background: r.color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', color: 'white', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', transition: 'width 1s cubic-bezier(.22,.8,.25,1)' }}>
                  <span>{r.count} BQ{r.count !== 1 ? 's' : ''}</span>
                  {r.value > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtShort(r.value)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Inline delete button ────────────────────────────────────────────────────────
function DeleteBQButton({ bqId, onDeleted }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.delete(`/bq/${bqId}`),
    onSuccess: onDeleted,
    onError: (err) => alert(err.response?.data?.error || 'Delete failed.'),
  });
  const handleClick = (e) => {
    e.stopPropagation();
    if (!armed) { setArmed(true); timer.current = setTimeout(() => setArmed(false), 3000); }
    else { clearTimeout(timer.current); mutate(); }
  };
  const handleBlur = () => { clearTimeout(timer.current); setArmed(false); };
  return (
    <button className="btn sm ghost" onClick={handleClick} onBlur={handleBlur} disabled={isPending}
      title={armed ? 'Click again to confirm delete' : 'Delete BQ'}
      style={{ color: armed ? 'var(--danger)' : undefined, borderColor: armed ? 'var(--danger)' : undefined, fontWeight: armed ? 600 : undefined, transition: 'color .15s, border-color .15s', whiteSpace: 'nowrap' }}>
      {isPending ? <Icon name="refresh" size={12} /> : armed ? <><Icon name="alert" size={12} /> Confirm?</> : <Icon name="x" size={12} />}
    </button>
  );
}

// ── Documents table (with working filters) ──────────────────────────────────────
function DocumentsTable({ bqs, loading, onOpen, onNew, onDeleted }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all' ? bqs : bqs.filter(b => b.status === activeFilter);
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Drafts' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'approved', label: 'Approved' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="card rise rise-3">
      <div className="card-head">
        <div className="card-title">BQ documents</div>
        <span className="card-sub" style={{ marginLeft: 6 }}>{filtered.length} / {bqs.length}</span>
        <div style={{ flex: 1 }} />
        {filters.map(f => (
          <button key={f.key} className={`btn sm ghost${activeFilter === f.key ? ' active' : ''}`}
            onClick={() => setActiveFilter(f.key)} aria-current={activeFilter === f.key}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Document</th>
              <th>Project</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Version</th>
              <th style={{ textAlign: 'right' }}>Items</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-mute)' }}>Loading BQ documents…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty" style={{ padding: 48 }}>
                    <Icon name="doc" size={32} style={{ color: 'var(--border-strong)' }} />
                    <div className="empty-title">{bqs.length === 0 ? 'No BQ documents yet' : `No ${activeFilter} BQs`}</div>
                    <div className="empty-sub">{bqs.length === 0 ? 'Create your first Bill of Quantities to start estimating.' : 'Try a different filter.'}</div>
                    {bqs.length === 0 && (
                      <button className="btn primary sm" onClick={onNew} style={{ marginTop: 14 }}>
                        <Icon name="plus" size={13} /> Create BQ
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(bq => (
              <tr key={bq.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(bq)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="doc" size={14} /></span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{bq.title}</div>
                      {bq.notes && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bq.notes}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>{bq.project_name || '— standalone'}</td>
                <td><span className={`pill ${STATUS_PILL[bq.status] || 'outline'}`}>{bq.status}</span></td>
                <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>v{bq.version}</td>
                <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-dim)' }}>{bq.item_count ?? 0}</td>
                <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  {Number(bq.total_amount) > 0
                    ? fmtRM(bq.total_amount)
                    : <span style={{ color: 'var(--text-dim)' }} title="Rate schedule — add quantities to price">{fmtRM(bq.rate_total)} <span style={{ fontSize: 10 }}>rates</span></span>}
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{bq.created_at ? format(new Date(bq.created_at), 'dd MMM yyyy') : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    <button className="btn sm ghost" onClick={() => onOpen(bq)} title="Open"><Icon name="chevR" size={12} /></button>
                    <DeleteBQButton bqId={bq.id} onDeleted={onDeleted} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export default function BQPage() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: bqs = [], isLoading } = useQuery({
    queryKey: ['bqs'],
    queryFn: () => api.get('/bq').then(r => r.data),
  });

  if (selected) {
    return (
      <>
        <div className="page-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn ghost sm" onClick={() => setSelected(null)}>
              <Icon name="chevL" size={14} /> Back
            </button>
            <div>
              <h1>{selected.title}</h1>
              <div className="sub">v{selected.version} · <span className={`pill ${STATUS_PILL[selected.status] || 'outline'}`} style={{ marginLeft: 2 }}>{selected.status}</span></div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <BQEditor
            bq={selected}
            onSaved={() => { setSelected(null); qc.invalidateQueries(['bqs']); }}
            onDeleted={() => { setSelected(null); qc.invalidateQueries({ queryKey: ['bqs'] }); }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tender / BQ</h1>
          <div className="sub">Bills of Quantities &amp; tender estimation</div>
        </div>
        <div className="actions">
          <button className="btn"><Icon name="download" size={14} /> Export</button>
          <button className="btn primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} /> New BQ</button>
        </div>
      </div>

      <div className="page-body dash-page">
        <div className="dash-cols" style={{ gridTemplateColumns: '5fr 7fr' }}>
          <AIScopeCard onComplete={(bq) => { if (bq) { setSelected(bq); qc.invalidateQueries(['bqs']); } else setShowNew(true); }} />
          <StatusFunnel bqs={bqs} />
        </div>
        <DocumentsTable bqs={bqs} loading={isLoading} onOpen={setSelected} onNew={() => setShowNew(true)}
          onDeleted={() => { qc.invalidateQueries({ queryKey: ['bqs'] }); setSelected(null); }} />
      </div>

      {showNew && (
        <NewBQModal
          onClose={() => setShowNew(false)}
          onCreated={(bq) => { setShowNew(false); setSelected(bq); qc.invalidateQueries(['bqs']); }}
        />
      )}
    </>
  );
}

// ── New BQ modal (with notes field) ──────────────────────────────────────────
function NewBQModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', projectId: '', notes: '' });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) });
  const projectList = projects?.projects || projects || [];

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.post('/bq', form);
      onCreated(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create BQ.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div className="modal-title">New BQ Document</div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="label">BQ Title *</label>
              <input className="input" placeholder="e.g. Phase 1 Road Resurfacing" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Link to Project <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}>(optional)</span></label>
              <select className="input" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">No project — standalone BQ</option>
                {projectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Notes <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}>(optional)</span></label>
              <textarea className="input" rows={2} style={{ resize: 'vertical' }}
                placeholder="Scope summary, tender ref, special conditions…"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving || !form.title}>
              {saving ? 'Creating…' : 'Create BQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── BQ editor ─────────────────────────────────────────────────────────────────
function normalizeItem(it) {
  return {
    ...it,
    itemCode: it.itemCode ?? it.item_code ?? '',
    unitRate: Number(it.unitRate ?? it.unit_rate ?? 0),
    quantity: it.quantity ?? '',
    amount: Number(it.amount ?? 0),
    rateSource: it.rateSource ?? it.rate_source ?? null,
    rateConfidence: it.rateConfidence ?? it.rate_confidence ?? null,
    id: it.id ?? Date.now() + Math.random(),
  };
}

// ── Live rate suggestion (debounced) shown under the add-item row ───────────────
// Calls the AI engine as the user types a description and offers the best rate
// from their past BQs / market library, plus a section guess.
function RateSuggestion({ description, unit, onUse }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!description || description.trim().length < 3) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/bq/suggest-rate', { params: { description, unit } });
        if (!cancelled) setData(res.data);
      } catch { if (!cancelled) setData(null); }
      finally { if (!cancelled) setLoading(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [description, unit]);

  if (!description || description.trim().length < 3) return null;
  const top = data?.suggestions?.[0];

  if (loading && !data) {
    return <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="ai" size={12} /> Searching past BQs…</div>;
  }
  if (!top && !data?.section) return null;

  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5 }}>
      {top && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>
          <Icon name="ai" size={12} />
          Suggested <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtRM(top.rate)}</strong>/{top.unit || unit || 'unit'}
          <span style={{ color: 'var(--text-dim)' }}>· {top.source === 'history' ? 'from your past BQs' : 'from market rates'} · {Math.round(top.confidence * 100)}%</span>
          <button className="btn sm primary" style={{ padding: '1px 8px', height: 22 }} onClick={() => onUse(top, data?.section)}>Use</button>
        </span>
      )}
      {data?.section && <span style={{ color: 'var(--text-mute)' }}>Section guess: <strong style={{ color: 'var(--text-dim)' }}>{data.section}</strong></span>}
    </div>
  );
}

// Provenance badge for a line item's rate.
function RateBadge({ source }) {
  if (!source || source === 'manual') return null;
  const map = {
    ai_history: { label: 'AI · past BQ', cls: 'accent' },
    ai_market: { label: 'AI · market', cls: 'accent' },
    extracted: { label: 'extracted', cls: 'muted' },
  };
  const b = map[source];
  if (!b) return null;
  return <span className={`pill ${b.cls}`} style={{ marginLeft: 8, fontSize: 9.5, padding: '1px 6px' }}>{b.label}</span>;
}

// Group items array by section, preserving original indices for editing.
function groupBySection(items) {
  const groups = [];
  const sectionMap = {};
  items.forEach((item, idx) => {
    const sec = item.section || '(uncategorised)';
    if (!sectionMap[sec]) {
      sectionMap[sec] = { section: sec, indices: [] };
      groups.push(sectionMap[sec]);
    }
    sectionMap[sec].indices.push(idx);
  });
  return groups;
}

function BQEditor({ bq, onSaved, onDeleted }) {
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['bq', bq.id],
    queryFn: () => api.get(`/bq/${bq.id}`).then(r => r.data),
    enabled: !!bq.id,
  });

  const [items, setItems] = useState(() => (bq.items || []).map(normalizeItem));
  const [seeded, setSeeded] = useState((bq.items || []).length > 0);
  const [notes, setNotes] = useState(bq.notes || '');
  const [editingIdx, setEditingIdx] = useState(null); // index of row being edited
  const [editRow, setEditRow] = useState(null);       // copy of item being edited
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!seeded && detail?.items) {
      setItems(detail.items.map(normalizeItem));
      setNotes(detail.notes || '');
      setSeeded(true);
    }
  }, [detail, seeded]);

  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', unit: '', quantity: '', unitRate: '', section: '', rateSource: '' });
  const set = (k, v) => setNewItem(n => ({ ...n, [k]: v }));

  // AI state
  const [aiBusy, setAiBusy] = useState(false);
  const [anomalyMap, setAnomalyMap] = useState(null); // { [idx]: { rate, confidence, source, deviation } } | null

  const addItem = () => {
    if (!newItem.description) return;
    const qty = Number(newItem.quantity || 0);
    const rate = Number(newItem.unitRate || 0);
    setItems(prev => [...prev, { ...newItem, rateSource: rate ? (newItem.rateSource || 'manual') : null, amount: qty * rate, id: Date.now() }]);
    setNewItem({ description: '', unit: '', quantity: '', unitRate: '', section: newItem.section, rateSource: '' }); // keep section
  };

  // Apply a live suggestion to the in-progress add-row.
  const useSuggestion = (sug, section) => {
    setNewItem(n => ({
      ...n,
      unitRate: String(sug.rate),
      rateSource: 'ai_' + sug.source,
      unit: n.unit || sug.unit || '',
      section: n.section || section || '',
    }));
  };

  // Auto-price every unpriced line from the AI engine in one round-trip.
  const autoPriceAll = async () => {
    const targets = items.map((it, idx) => ({ idx, it })).filter(x => !Number(x.it.unitRate));
    if (targets.length === 0) return;
    setAiBusy(true);
    try {
      const res = await api.post('/bq/suggest-rates-batch', { items: targets.map(x => ({ description: x.it.description, unit: x.it.unit })) });
      const sugg = res.data.suggestions || [];
      let filled = 0;
      setItems(prev => {
        const copy = [...prev];
        targets.forEach((x, i) => {
          const s = sugg[i];
          if (s && s.confidence >= 0.4) {
            const qty = Number(copy[x.idx].quantity || 0);
            copy[x.idx] = { ...copy[x.idx], unitRate: s.rate, amount: qty * s.rate, rateSource: 'ai_' + s.source, rateConfidence: s.confidence };
            filled++;
          }
        });
        return copy;
      });
      alert(filled > 0 ? `Auto-priced ${filled} of ${targets.length} unpriced item(s). Review and Save to keep.` : 'No confident matches found in your past BQs or market rates.');
    } catch (err) { alert(err.response?.data?.error || 'Auto-price failed.'); }
    finally { setAiBusy(false); }
  };

  // Flag priced lines whose rate deviates sharply from the AI's best match.
  const scanAnomalies = async () => {
    const priced = items.map((it, idx) => ({ idx, it })).filter(x => Number(x.it.unitRate) > 0);
    if (priced.length === 0) { setAnomalyMap({}); return; }
    setAiBusy(true);
    try {
      const res = await api.post('/bq/suggest-rates-batch', { items: priced.map(x => ({ description: x.it.description, unit: x.it.unit })) });
      const sugg = res.data.suggestions || [];
      const map = {};
      priced.forEach((x, i) => {
        const s = sugg[i];
        if (!s || s.confidence < 0.5 || s.rate <= 0) return;
        const cur = Number(x.it.unitRate);
        const deviation = (cur - s.rate) / s.rate;
        if (Math.abs(deviation) >= 0.5) map[x.idx] = { ...s, deviation };
      });
      setAnomalyMap(map);
    } catch (err) { alert(err.response?.data?.error || 'Scan failed.'); }
    finally { setAiBusy(false); }
  };

  const fixAnomaly = (idx) => {
    const a = anomalyMap?.[idx];
    if (!a) return;
    setItems(prev => prev.map((it, i) => i === idx
      ? { ...it, unitRate: a.rate, amount: Number(it.quantity || 0) * a.rate, rateSource: 'ai_' + a.source, rateConfidence: a.confidence }
      : it));
    setAnomalyMap(m => { const c = { ...m }; delete c[idx]; return c; });
  };

  const removeItem = (idx) => {
    if (editingIdx === idx) { setEditingIdx(null); setEditRow(null); }
    setItems(items.filter((_, i) => i !== idx));
  };

  // Start editing a row
  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditRow({ ...items[idx] });
  };

  // Commit the inline edit
  const commitEdit = () => {
    if (editRow === null) return;
    const qty = Number(editRow.quantity || 0);
    const rate = Number(editRow.unitRate || 0);
    setItems(prev => prev.map((it, i) => i === editingIdx ? { ...editRow, amount: qty * rate } : it));
    setEditingIdx(null); setEditRow(null);
  };

  const cancelEdit = () => { setEditingIdx(null); setEditRow(null); };

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const pricedCount = items.filter(i => Number(i.unitRate) > 0).length;
  const unpricedCount = items.length - pricedCount;
  const coverage = items.length ? Math.round((pricedCount / items.length) * 100) : 0;
  const anomalyCount = anomalyMap ? Object.keys(anomalyMap).length : 0;
  const status = detail?.status || bq.status || 'draft';
  const editable = status === 'draft' || status === 'submitted';
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/bq/${bq.id}`, { items, totalAmount: total, notes });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleExport = async (fmt) => {
    try {
      const res = await api.get(`/bq/${bq.id}/export`, { params: { format: fmt }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${(bq.title || 'bq').replace(/[^a-z0-9]+/gi, '_')}.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed.'); }
  };

  const handleTransition = async (to) => {
    setBusy(true);
    try { await api.post(`/bq/${bq.id}/transition`, { to }); onSaved(); }
    catch (err) { alert(err.response?.data?.error || 'Transition failed.'); }
    finally { setBusy(false); }
  };

  const handleImportRates = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/bq/${bq.id}/import-rates`);
      alert(`${res.data.imported} rates added to your rate library.`);
    } catch (err) { alert(err.response?.data?.error || 'Import failed.'); }
    finally { setBusy(false); }
  };

  const previewAmount = Number(newItem.quantity || 0) * Number(newItem.unitRate || 0);
  const groups = groupBySection(items);

  return (
    <div className="dash-page">
      {/* Notes field */}
      {(notes || editable) && (
        <div className="card">
          <div className="card-head"><div className="card-title">Notes</div></div>
          <div className="card-body">
            <textarea className="input" rows={2} style={{ resize: 'vertical', width: '100%' }}
              placeholder="Scope summary, tender ref, special conditions…"
              value={notes} onChange={e => setNotes(e.target.value)}
              disabled={!editable} />
          </div>
        </div>
      )}

      {/* Add line item + toolbar */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Line items</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtRM(total)}</span>
          </div>
          <button className="btn sm ghost" onClick={() => handleExport('xlsx')} title="Export Excel"><Icon name="download" size={13} /> XLSX</button>
          <button className="btn sm ghost" onClick={() => handleExport('pdf')} title="Export PDF"><Icon name="download" size={13} /> PDF</button>
          <button className="btn sm ghost" onClick={handleImportRates} disabled={busy} title="Add these rates to your rate library"><Icon name="plus" size={13} /> To rate library</button>
          <button className="btn sm ghost" onClick={() => setShowHistory(h => !h)} title="Version history">
            <Icon name="clock" size={13} /> History
          </button>
          {status === 'draft' && <button className="btn sm" onClick={() => handleTransition('submitted')} disabled={busy}>Submit</button>}
          {status === 'submitted' && <button className="btn sm" style={{ background: 'var(--good)', color: '#fff' }} onClick={() => handleTransition('approved')} disabled={busy}>Approve</button>}
          <button className="btn primary sm" onClick={handleSave} disabled={saving || !editable} title={editable ? '' : `Locked (${status})`}>
            <Icon name="check" size={13} /> {saving ? 'Saving…' : 'Save BQ'}
          </button>
          <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
          <DeleteBQButton bqId={bq.id} onDeleted={onDeleted} />
        </div>

        {/* Add row */}
        {editable && (
          <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 4fr 1fr 1fr 1.5fr auto', gap: 8, alignItems: 'center' }}>
              <input className="input" placeholder="Section" value={newItem.section} onChange={e => set('section', e.target.value)} />
              <input className="input" placeholder="Description *" value={newItem.description} onChange={e => set('description', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()} />
              <input className="input" placeholder="Unit" value={newItem.unit} onChange={e => set('unit', e.target.value)} />
              <input className="input" type="number" placeholder="Qty" value={newItem.quantity} onChange={e => set('quantity', e.target.value)} />
              <input className="input" type="number" placeholder="Rate" value={newItem.unitRate}
                onChange={e => setNewItem(n => ({ ...n, unitRate: e.target.value, rateSource: '' }))} />
              <button className="btn primary" onClick={addItem} disabled={!newItem.description} style={{ height: 38 }}>
                <Icon name="plus" size={14} />
              </button>
            </div>
            {previewAmount > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                Amount: {fmtRM(previewAmount)}
              </div>
            )}
            {/* Live AI rate suggestion as you type */}
            <RateSuggestion description={newItem.description} unit={newItem.unit} onUse={useSuggestion} />
          </div>
        )}
      </div>

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--blueprint)', opacity: .25, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div className="card-head">
              <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="ai" size={13} />
              </span>
              <div className="card-title">AI insights</div>
              <span className="pill accent">Beta</span>
              <div style={{ flex: 1 }} />
              {editable && unpricedCount > 0 && (
                <button className="btn sm primary" onClick={autoPriceAll} disabled={aiBusy}>
                  <Icon name="zap" size={13} /> {aiBusy ? 'Pricing…' : `Auto-price ${unpricedCount} item${unpricedCount !== 1 ? 's' : ''}`}
                </button>
              )}
              <button className="btn sm ghost" onClick={scanAnomalies} disabled={aiBusy}>
                <Icon name="alert" size={13} /> Scan for anomalies
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Coverage bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Pricing coverage</span>
                  <span style={{ fontWeight: 600 }}>{pricedCount}/{items.length} priced · <span style={{ color: coverage === 100 ? 'var(--good)' : 'var(--warn)' }}>{coverage}%</span></span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'var(--bg-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${coverage}%`, height: '100%', background: coverage === 100 ? 'var(--good)' : 'var(--accent)', borderRadius: 6, transition: 'width .6s cubic-bezier(.22,.8,.25,1)' }} />
                </div>
              </div>

              {/* Anomaly results */}
              {anomalyMap !== null && (
                anomalyCount === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--good)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={13} /> No rate anomalies — all priced lines look consistent with your history & market rates.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600 }}>
                      {anomalyCount} line{anomalyCount !== 1 ? 's' : ''} deviate sharply from the expected rate:
                    </div>
                    {Object.entries(anomalyMap).map(([idx, a]) => {
                      const it = items[idx];
                      if (!it) return null;
                      const over = a.deviation > 0;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12 }}>
                          <Icon name="alert" size={14} style={{ color: over ? 'var(--danger)' : 'var(--warn)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.description}</div>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                              Current <strong style={{ color: over ? 'var(--danger)' : 'var(--warn)' }}>{fmtRM(it.unitRate)}</strong>
                              {' '}vs expected <strong>{fmtRM(a.rate)}</strong> ({over ? '+' : ''}{Math.round(a.deviation * 100)}%)
                              {' '}· {a.source === 'history' ? 'past BQs' : 'market'}
                            </div>
                          </div>
                          {editable && (
                            <button className="btn sm ghost" onClick={() => fixAnomaly(Number(idx))} style={{ flexShrink: 0 }}>
                              Use {fmtRM(a.rate)}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items table with section grouping + subtotals */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>Section / Description</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate (RM)</th>
                <th style={{ textAlign: 'right' }}>Amount (RM)</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-mute)' }}>
                  {(loadingDetail && !seeded) ? 'Loading line items…' : 'No items yet — add your first line item above.'}
                </td></tr>
              )}

              {groups.map(group => {
                const subtotal = group.indices.reduce((s, i) => s + Number(items[i].amount || 0), 0);
                return (
                  <SectionGroup key={group.section} group={group} items={items}
                    subtotal={subtotal} editable={editable}
                    editingIdx={editingIdx} editRow={editRow}
                    anomalyMap={anomalyMap}
                    onEdit={startEdit} onCommit={commitEdit} onCancel={cancelEdit}
                    onEditChange={(k, v) => setEditRow(r => ({ ...r, [k]: v }))}
                    onRemove={removeItem} />
                );
              })}

              {items.length > 0 && (
                <tr style={{ background: 'var(--surface-2)' }}>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>Grand Total</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
                    {Number(total).toLocaleString('en-MY')}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Version history panel */}
      {showHistory && <HistoryPanel bqId={bq.id} onClose={() => setShowHistory(false)} />}
    </div>
  );
}

// ── Section group with subtotal row ────────────────────────────────────────────
function SectionGroup({ group, items, subtotal, editable, editingIdx, editRow, anomalyMap, onEdit, onCommit, onCancel, onEditChange, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Section header row */}
      <tr style={{ background: 'var(--surface-2)', cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
        <td>
          <Icon name={collapsed ? 'chevR' : 'chevD'} size={12} style={{ color: 'var(--text-mute)' }} />
        </td>
        <td colSpan={4} style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {group.section}
          <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-mute)' }}>({group.indices.length} item{group.indices.length !== 1 ? 's' : ''})</span>
        </td>
        <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>
          {subtotal > 0 ? Number(subtotal).toLocaleString('en-MY') : '—'}
        </td>
        <td />
      </tr>

      {/* Item rows */}
      {!collapsed && group.indices.map(idx => {
        const item = items[idx];
        const isEditing = editingIdx === idx;
        const er = editRow;

        if (isEditing) {
          const previewAmt = Number(er.quantity || 0) * Number(er.unitRate || 0);
          return (
            <tr key={item.id || idx} style={{ background: 'var(--accent-soft)' }}>
              <td></td>
              <td>
                <input className="input" style={{ fontSize: 12, padding: '4px 8px' }}
                  value={er.description} onChange={e => onEditChange('description', e.target.value)} autoFocus />
              </td>
              <td>
                <input className="input" style={{ fontSize: 12, padding: '4px 8px', width: 60 }}
                  value={er.unit} onChange={e => onEditChange('unit', e.target.value)} />
              </td>
              <td>
                <input className="input" type="number" style={{ fontSize: 12, padding: '4px 8px', width: 70, textAlign: 'right' }}
                  value={er.quantity} onChange={e => onEditChange('quantity', e.target.value)} />
              </td>
              <td>
                <input className="input" type="number" style={{ fontSize: 12, padding: '4px 8px', width: 90, textAlign: 'right' }}
                  value={er.unitRate} onChange={e => onEditChange('unitRate', e.target.value)} />
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                {previewAmt > 0 ? previewAmt.toLocaleString('en-MY') : '—'}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn sm primary" onClick={onCommit} title="Save"><Icon name="check" size={12} /></button>
                  <button className="btn sm ghost" onClick={onCancel} title="Cancel"><Icon name="x" size={12} /></button>
                </div>
              </td>
            </tr>
          );
        }

        const anomaly = anomalyMap?.[idx];
        return (
          <tr key={item.id || idx}
            style={{ cursor: editable ? 'pointer' : 'default', background: anomaly ? 'var(--danger-soft)' : undefined }}
            onClick={() => editable && onEdit(idx)}
            title={editable ? 'Click to edit' : ''}>
            <td></td>
            <td style={{ fontWeight: 500 }}>
              {item.itemCode && <span style={{ fontSize: 10, color: 'var(--text-mute)', marginRight: 6, fontFamily: 'JetBrains Mono, monospace' }}>{item.itemCode}</span>}
              {item.description}
              <RateBadge source={item.rateSource} />
              {anomaly && <Icon name="alert" size={12} style={{ color: 'var(--danger)', marginLeft: 6, verticalAlign: 'middle' }} title={`Expected ~${fmtRM(anomaly.rate)}`} />}
            </td>
            <td style={{ color: 'var(--text-dim)' }}>{item.unit || '—'}</td>
            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{item.quantity || '—'}</td>
            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: anomaly ? 'var(--danger)' : undefined }}>{Number(item.unitRate || 0).toLocaleString('en-MY')}</td>
            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{Number(item.amount || 0).toLocaleString('en-MY')}</td>
            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <button className="btn sm ghost" onClick={() => onRemove(idx)} title="Remove">
                <Icon name="x" size={12} />
              </button>
            </td>
          </tr>
        );
      })}

      {/* Section subtotal */}
      {!collapsed && group.indices.length > 1 && (
        <tr style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--border)' }}>
          <td></td>
          <td colSpan={4} style={{ fontSize: 11.5, color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Subtotal — {group.section}
          </td>
          <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>
            {Number(subtotal).toLocaleString('en-MY')}
          </td>
          <td />
        </tr>
      )}
    </>
  );
}

// ── Version history panel ───────────────────────────────────────────────────────
function HistoryPanel({ bqId, onClose }) {
  const { data: audit = [], isLoading } = useQuery({
    queryKey: ['bq-audit', bqId],
    queryFn: () => api.get(`/bq/${bqId}/audit`).then(r => r.data),
  });

  const ACTION_LABELS = {
    created: 'Created', uploaded: 'Uploaded', items_replaced: 'Items saved',
    item_added: 'Item added', item_updated: 'Item updated', item_deleted: 'Item deleted',
    status_changed: 'Status changed', duplicated: 'Duplicated', deleted: 'Deleted',
    exported: 'Exported', rates_imported: 'Rates imported', rate_applied: 'Rate applied',
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><Icon name="clock" size={14} /> Version history</div>
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" onClick={onClose}><Icon name="x" size={13} /> Close</button>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
        {isLoading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-mute)' }}>Loading…</div>}
        {!isLoading && audit.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-mute)' }}>No history yet.</div>}
        <table className="tbl">
          <thead>
            <tr><th>When</th><th>Action</th><th>By</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {audit.map(a => (
              <tr key={a.id}>
                <td style={{ color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {a.created_at ? format(new Date(a.created_at), 'dd MMM yyyy HH:mm') : '—'}
                </td>
                <td>
                  <span className={`pill ${a.action === 'deleted' ? 'danger' : a.action === 'status_changed' && a.to_status === 'approved' ? 'good' : 'muted'}`}>
                    {ACTION_LABELS[a.action] || a.action}
                  </span>
                  {a.from_status && a.to_status && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>
                      {a.from_status} → {a.to_status}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{a.user_name || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--text-mute)', maxWidth: 200 }}>
                  {a.detail ? (
                    typeof a.detail === 'object'
                      ? Object.entries(a.detail).map(([k, v]) => `${k}: ${v}`).join(' · ')
                      : String(a.detail)
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
