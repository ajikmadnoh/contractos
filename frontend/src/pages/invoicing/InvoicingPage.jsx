import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';

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
          <div className="text-5xl mb-4">🧾</div>
          <h3 className="text-white font-semibold mb-2">No invoices yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first invoice to start tracking payments.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">Create Invoice</button>
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
                <tr key={inv.id} className={`border-b border-navy-light hover:bg-navy-light transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-navy-dark bg-opacity-30'}`}>
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
      </div>
    </>
  );
}

function NewInvoiceModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [taxRate, setTaxRate] = useState(0);

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
