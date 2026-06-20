import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import Icon from '../../components/Icon';

const STATUS_STYLES = {
  paid: 'badge-success',
  unpaid: 'badge-warning',
  overdue: 'badge-danger',
  partially_paid: 'text-xs px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300',
  draft: 'text-xs px-2.5 py-0.5 rounded-full bg-navy-light text-gray-400',
  cancelled: 'text-xs px-2.5 py-0.5 rounded-full bg-navy-light text-gray-500',
};

export default function InvoicingPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const qc = useQueryClient();

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => api.get(`/invoices${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const totalOutstanding = invoices
    .filter(i => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partially_paid')
    .reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid || 0)), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Invoicing</h1>
          <p className="page-sub">
            Outstanding: <strong style={{ color: 'var(--warn)' }}>RM {totalOutstanding.toLocaleString()}</strong>
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn primary sm">+ New Invoice</button>
      </div>

      {/* Status filter */}
      <div style={{ padding: '10px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['', 'unpaid', 'overdue', 'partially_paid', 'paid', 'draft'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`seg-btn${statusFilter === s ? ' active' : ''}`}>
            {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="page-body">

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div className="card text-center py-16">
          <div style={{ 
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'var(--accent-soft)', color: 'var(--accent-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="doc" size={26} />
          </div>
          <h3 className="text-white font-semibold mb-2">No invoices yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first invoice to start tracking payments.</p>
          <button onClick={() => setShowNew(true)} className="btn primary">Create Invoice</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Invoice #</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Client</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Project</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Date</th>
                <th className="text-right text-xs text-gray-400 font-medium px-6 py-4">Amount</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id}
                  onClick={() => setSelectedInvoice(inv.id)}
                  className={`border-b border-navy-light hover:bg-navy-light transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-navy-dark bg-opacity-30'}`}>
                  <td className="px-6 py-4 font-mono text-xs text-gold">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-white">{inv.client_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-400">{inv.project_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-400">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-6 py-4 text-right text-white font-medium">
                    {inv.currency} {Number(inv.total).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={STATUS_STYLES[inv.status] || 'badge-warning'}>
                      {inv.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewInvoiceModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refetch(); }} />}
      {selectedInvoice && (
        <InvoiceDetailDrawer
          invoiceId={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onStatusChanged={() => { refetch(); qc.invalidateQueries(['invoices']); }}
        />
      )}
      </div>
    </>
  );
}

function NewInvoiceModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [taxRate, setTaxRate] = useState(0);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');

  const { data: clientProfiles = [] } = useQuery({
    queryKey: ['profiles-clients'],
    queryFn: () => api.get('/profiles').then(r =>
      (r.data || []).filter(p => ['client', 'main_contractor'].includes(p.profile_type))
    ),
    staleTime: 5 * 60_000,
  });

  const { data: projectsData = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects').then(r => r.data?.projects || r.data || []),
    staleTime: 5 * 60_000,
  });

  const addItem = () => setItems(i => [...i, { description: '', quantity: 1, unitPrice: '' }]);
  const updateItem = (idx, field, val) => setItems(items.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice || 0)), 0);
  const taxAmt = subtotal * (taxRate / 100);
  const total = subtotal + taxAmt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.target);
      await api.post('/invoices', {
        invoiceDate: form.get('invoiceDate'),
        dueDate: form.get('dueDate'),
        currency: form.get('currency'),
        taxRate: Number(taxRate),
        notes: form.get('notes'),
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        items: items.map(i => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      });
      onCreated();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="card w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">New Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <select className="input-field" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— No client —</option>
                {clientProfiles.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Project</label>
              <select className="input-field" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">— No project —</option>
                {projectsData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" name="invoiceDate" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" name="dueDate" className="input-field" />
            </div>
            <div>
              <label className="label">Currency</label>
              <select name="currency" className="input-field">
                <option value="MYR">MYR</option>
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Line Items</label>
              <button type="button" onClick={addItem} className="text-xs text-gold hover:text-gold-light">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input className="input-field col-span-6" placeholder="Description"
                    value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} required />
                  <input type="number" className="input-field col-span-2" placeholder="Qty"
                    value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} min="0" />
                  <input type="number" className="input-field col-span-3" placeholder="Unit Price"
                    value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} min="0" />
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-gray-500 hover:text-red-400 col-span-1 text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="label">SST/GST Rate (%)</label>
              <select className="input-field" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
                <option value={0}>No Tax (0%)</option>
                <option value={6}>SST 6%</option>
                <option value={8}>SST 8%</option>
              </select>
            </div>
            <div className="text-right pt-4">
              <p className="text-xs text-gray-400">Subtotal: RM {subtotal.toLocaleString()}</p>
              {taxRate > 0 && <p className="text-xs text-gray-400">Tax ({taxRate}%): RM {taxAmt.toLocaleString()}</p>}
              <p className="text-white font-bold mt-1">Total: RM {total.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea name="notes" rows={2} className="input-field resize-none" placeholder="Payment terms, bank details, etc." />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Create Invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Invoice detail drawer ─────────────────────────────────────────────────────

const INV_STATUS_COLOR = {
  paid: 'var(--good)', unpaid: 'var(--warn)', overdue: 'var(--danger)',
  draft: 'var(--text-mute)', partially_paid: 'var(--info)', cancelled: 'var(--text-dim)',
  sent: 'var(--info)',
};

function InvoiceDetailDrawer({ invoiceId, onClose, onStatusChanged }) {
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);
  const qc = useQueryClient();

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: () => api.get(`/invoices/${invoiceId}`).then(r => r.data),
    staleTime: 30_000,
  });

  const changeStatus = async (status, setLoading) => {
    setLoading(true);
    try {
      await api.patch(`/invoices/${invoiceId}/status`, { status });
      qc.invalidateQueries(['invoice-detail', invoiceId]);
      onStatusChanged();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  const fmtRM = v => 'RM ' + parseFloat(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 });
  const fmtD  = d => d ? format(new Date(d), 'dd MMM yyyy') : '—';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '95vw',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .2s ease',
      }}>
        {isLoading || !inv ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mute)' }}>Loading…</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--text-mute)', fontFamily: 'monospace', marginBottom: 4 }}>{inv.invoice_number}</p>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{inv.client_name || inv.project_name || 'Invoice'}</h2>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: 'rgba(255,255,255,.06)', color: INV_STATUS_COLOR[inv.status] || 'var(--text-mute)',
                  textTransform: 'uppercase', letterSpacing: '.05em',
                }}>
                  {inv.status?.replace('_', ' ')}
                </span>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: 22, cursor: 'pointer', padding: 4 }}>×</button>
            </div>

            {/* Meta row */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Invoice Date', value: fmtD(inv.invoice_date) },
                { label: 'Due Date',     value: fmtD(inv.due_date) },
                { label: 'Project',      value: inv.project_name || '—' },
                { label: 'Client',       value: inv.client_name  || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Line items */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                Line Items
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(inv.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: 'var(--text)' }}>{item.description}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-mute)' }}>{item.quantity} × {fmtRM(item.unit_price)}</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmtRM(item.amount)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'Subtotal', value: fmtRM(inv.subtotal) },
                inv.tax_rate > 0 && { label: `Tax (${inv.tax_rate}%)`, value: fmtRM(inv.tax_amount) },
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmtRM(inv.total)}</span>
              </div>
              {inv.amount_paid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--good)' }}>Amount Paid</span>
                  <span style={{ fontSize: 13, color: 'var(--good)' }}>{fmtRM(inv.amount_paid)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {inv.notes && (
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>Notes</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{inv.notes}</p>
              </div>
            )}

            {/* Actions */}
            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Actions</p>
                {inv.status === 'draft' && (
                  <button
                    disabled={markingSent}
                    onClick={() => changeStatus('sent', setMarkingSent)}
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--info)', background: 'var(--info-soft)', color: 'var(--info)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {markingSent ? 'Updating…' : <><Icon name="send" size={13} /> Mark as Sent</>}
                  </button>
                )}
                <button
                  disabled={markingPaid}
                  onClick={() => changeStatus('paid', setMarkingPaid)}
                  style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--good)', background: 'var(--good-soft)', color: 'var(--good)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {markingPaid ? 'Updating…' : <><Icon name="check" size={13} /> Mark as Paid</>}
                </button>
                {inv.status !== 'cancelled' && (
                  <button
                    onClick={() => { if (window.confirm('Cancel this invoice?')) changeStatus('cancelled', () => {}); }}
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mute)', fontSize: 13, cursor: 'pointer' }}>
                    Cancel Invoice
                  </button>
                )}
              </div>
            )}
            {inv.status === 'paid' && (
              <div style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--good)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: '50%', background: 'var(--good-soft)', color: 'var(--good)', marginBottom: 8 }}>
                  <Icon name="check" size={20} />
                </div>
                <p style={{ fontWeight: 600 }}>Invoice Paid</p>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
