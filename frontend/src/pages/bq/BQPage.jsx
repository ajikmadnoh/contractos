import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [step, setStep] = useState(0); // 0 idle, 1 uploading, 2-5 stages, 6 done
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [createdBQ, setCreatedBQ] = useState(null);
  const [error, setError] = useState(null);

  // Real extraction stats from the backend (populated after upload).
  const ex = createdBQ?.extraction;
  const stages = [
    {
      step: 2, label: 'OCR & section detection',
      detail: ex ? `${ex.pages || 0} page${ex.pages === 1 ? '' : 's'} · ${ex.sectionCount || 0} section${ex.sectionCount === 1 ? '' : 's'} found` : null,
    },
    {
      step: 3, label: 'BQ scope extraction',
      detail: ex ? `${ex.itemCount || 0} line item${ex.itemCount === 1 ? '' : 's'} extracted` : null,
    },
    {
      step: 4, label: 'Quantity & rate parsing',
      detail: ex ? `${fmtRM(ex.total || 0)} estimated total` : null,
    },
    {
      step: 5, label: 'Draft BQ assembled',
      detail: ex && ex.itemCount === 0 ? 'No priced rows detected — start manually' : 'Ready to review',
    },
  ];

  useEffect(() => {
    if (step < 2 || step >= 5) return;
    const id = setTimeout(() => setStep(s => s + 1), 900);
    return () => clearTimeout(id);
  }, [step]);

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setError(null);
    setStep(1);

    const formData = new FormData();
    formData.append('file', f);
    try {
      const res = await api.post('/bq/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCreatedBQ(res.data);
      setStep(2); // start stage animation
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
      setStep(0);
      setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const reset = () => { setStep(0); setFile(null); setCreatedBQ(null); setError(null); };

  const fmtSize = (b) => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';

  return (
    <div className="card rise rise-1" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--blueprint)', opacity: .35, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div className="card-head">
          <span style={{
            width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', color: 'var(--accent-fg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><Icon name="ai" size={14} /></span>
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
                style={{
                  display: 'block', width: '100%', border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
                  borderRadius: 12, padding: '32px 16px', textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)',
                  transition: 'all .15s',
                }}>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-2)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}><Icon name="paperclip" size={20} /></div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Drop tender PDF here</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>
                  or click to browse · Max 80MB · BQ-tab Excel also supported
                </div>
              </label>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* File pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="doc" size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{file ? fmtSize(file.size) : ''} · {step === 1 ? 'Uploading…' : 'uploaded'}</div>
                </div>
                {step >= 2 && <Icon name="check" size={16} style={{ color: 'var(--good)', flexShrink: 0 }} />}
              </div>

              {/* Stage list (only shown once upload done) */}
              {step >= 2 && stages.map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: step > s.step ? 'var(--good)' : step === s.step ? 'var(--accent)' : 'var(--bg-2)',
                    color: step >= s.step ? 'white' : 'var(--text-mute)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                  }}>
                    {step > s.step ? <Icon name="check" size={12} /> :
                      step === s.step ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', animation: 'pulse 1s infinite' }} /> :
                        s.step - 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: step === s.step ? 600 : 500, color: step < s.step ? 'var(--text-mute)' : 'var(--text)' }}>{s.label}</div>
                    {step >= s.step && s.detail && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.detail}</div>}
                  </div>
                </div>
              ))}

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

// ── Status funnel (driven by real BQ data) ──────────────────────────────────────
function StatusFunnel({ bqs }) {
  const order = [
    { key: 'draft',     label: 'Draft',     color: 'var(--text-mute)' },
    { key: 'submitted', label: 'Submitted', color: 'var(--warn)' },
    { key: 'approved',  label: 'Approved',  color: 'var(--good)' },
    { key: 'archived',  label: 'Archived',  color: 'var(--text-dim)' },
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
                <div style={{
                  width: `${Math.max(w, r.count > 0 ? 18 : 0)}%`, height: '100%', background: r.color, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px',
                  color: 'white', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
                  transition: 'width 1s cubic-bezier(.22,.8,.25,1)',
                }}>
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

// ── Documents table ─────────────────────────────────────────────────────────────
function DocumentsTable({ bqs, loading, onOpen, onNew }) {
  return (
    <div className="card rise rise-3">
      <div className="card-head">
        <div className="card-title">BQ documents</div>
        <span className="card-sub" style={{ marginLeft: 6 }}>{bqs.length} total</span>
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" aria-current="page">All</button>
        <button className="btn sm ghost">Drafts</button>
        <button className="btn sm ghost">Approved</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Document</th>
              <th>Project</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Version</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-mute)' }}>Loading BQ documents…</td></tr>
            )}
            {!loading && bqs.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty" style={{ padding: 48 }}>
                    <Icon name="doc" size={32} style={{ color: 'var(--border-strong)' }} />
                    <div className="empty-title">No BQ documents yet</div>
                    <div className="empty-sub">Create your first Bill of Quantities to start estimating.</div>
                    <button className="btn primary sm" onClick={onNew} style={{ marginTop: 14 }}>
                      <Icon name="plus" size={13} /> Create BQ
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {bqs.map(bq => (
              <tr key={bq.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(bq)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-2)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Icon name="doc" size={14} /></span>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{bq.title}</div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>{bq.project_name || '— standalone'}</td>
                <td><span className={`pill ${STATUS_PILL[bq.status] || 'outline'}`}>{bq.status}</span></td>
                <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>v{bq.version}</td>
                <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{fmtRM(bq.total_amount)}</td>
                <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{bq.created_at ? format(new Date(bq.created_at), 'dd MMM yyyy') : '—'}</td>
                <td><button className="btn sm ghost"><Icon name="chevR" size={12} /></button></td>
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
          <BQEditor bq={selected} onSaved={() => { setSelected(null); qc.invalidateQueries(['bqs']); }} />
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
          <button className="btn ghost"><Icon name="filter" size={14} /> Filter</button>
          <button className="btn"><Icon name="download" size={14} /> Export</button>
          <button className="btn primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} /> New BQ</button>
        </div>
      </div>

      <div className="page-body dash-page">
        <div className="dash-cols" style={{ gridTemplateColumns: '5fr 7fr' }}>
          <AIScopeCard onComplete={(bq) => {
            if (bq) { setSelected(bq); qc.invalidateQueries(['bqs']); }
            else setShowNew(true);
          }} />
          <StatusFunnel bqs={bqs} />
        </div>

        <DocumentsTable
          bqs={bqs}
          loading={isLoading}
          onOpen={setSelected}
          onNew={() => setShowNew(true)}
        />
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

// ── New BQ modal ──────────────────────────────────────────────────────────────
function NewBQModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', projectId: '' });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) });
  const projectList = projects?.projects || projects || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/bq', form);
      onCreated(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create BQ.');
    } finally {
      setSaving(false);
    }
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
function BQEditor({ bq, onSaved }) {
  const [items, setItems] = useState(bq.items || []);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', unit: '', quantity: '', unitRate: '', section: '' });
  const set = (k, v) => setNewItem(n => ({ ...n, [k]: v }));

  const addItem = () => {
    if (!newItem.description) return;
    setItems(prev => [...prev, {
      ...newItem,
      amount: Number(newItem.quantity || 0) * Number(newItem.unitRate || 0),
      id: Date.now(),
    }]);
    setNewItem({ description: '', unit: '', quantity: '', unitRate: '', section: '' });
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/bq/${bq.id}`, { items, totalAmount: total });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const previewAmount = Number(newItem.quantity || 0) * Number(newItem.unitRate || 0);

  return (
    <div className="dash-page">
      {/* Add line item */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Add line item</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtRM(total)}</span>
          </div>
          <button className="btn primary sm" onClick={handleSave} disabled={saving}>
            <Icon name="check" size={13} /> {saving ? 'Saving…' : 'Save BQ'}
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 4fr 1fr 1fr 1.5fr auto', gap: 8, alignItems: 'center' }}>
            <input className="input" placeholder="Section" value={newItem.section} onChange={e => set('section', e.target.value)} />
            <input className="input" placeholder="Description *" value={newItem.description} onChange={e => set('description', e.target.value)} />
            <input className="input" placeholder="Unit" value={newItem.unit} onChange={e => set('unit', e.target.value)} />
            <input className="input" type="number" placeholder="Qty" value={newItem.quantity} onChange={e => set('quantity', e.target.value)} />
            <input className="input" type="number" placeholder="Rate" value={newItem.unitRate} onChange={e => set('unitRate', e.target.value)} />
            <button className="btn primary" onClick={addItem} disabled={!newItem.description} style={{ height: 38 }}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          {previewAmount > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
              Amount: {fmtRM(previewAmount)}
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Section</th>
                <th>Description</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate (RM)</th>
                <th style={{ textAlign: 'right' }}>Amount (RM)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-mute)' }}>No items yet — add your first line item above.</td></tr>
              )}
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{item.section || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{item.description}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{item.unit || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{Number(item.unitRate || 0).toLocaleString('en-MY')}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{Number(item.amount || 0).toLocaleString('en-MY')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn sm ghost" onClick={() => removeItem(idx)} title="Remove">
                      <Icon name="x" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length > 0 && (
                <tr style={{ background: 'var(--surface-2)' }}>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--accent)' }}>{Number(total).toLocaleString('en-MY')}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
