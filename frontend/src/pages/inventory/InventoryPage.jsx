import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';

const TABS = [
  { id: 'items', label: 'Items', icon: '📦' },
  { id: 'transactions', label: 'In / Out Log', icon: '📋' },
];

const CATEGORIES = ['All', 'Building Materials', 'Steel & Metal', 'Electrical', 'Plumbing', 'Hardware', 'Tools', 'Safety Equipment', 'Consumables', 'Other'];

export default function InventoryPage() {
  const [tab, setTab] = useState('items');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="text-gray-400 text-sm mt-1">Track materials, tools and supplies across all projects</p>
      </div>

      <InventorySummary />

      <div className="flex gap-1 mb-6 border-b border-navy-light">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'items' && <ItemsTab />}
      {tab === 'transactions' && <TransactionsTab />}
    </div>
  );
}

function InventorySummary() {
  const { data } = useQuery({ queryKey: ['inventory-items'], queryFn: () => api.get('/inventory/items').then(r => r.data) });
  const items = data?.items || [];
  const lowStock = items.filter(i => i.quantity <= (i.reorder_level || 0));
  const totalValue = items.reduce((s, i) => s + parseFloat(i.quantity || 0) * parseFloat(i.unit_cost || 0), 0);
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Items', value: items.length, icon: '📦' },
        { label: 'Low Stock Alerts', value: lowStock.length, icon: '⚠️', cls: lowStock.length > 0 ? 'text-yellow-400' : 'text-success' },
        { label: 'Total Stock Value', value: 'RM ' + totalValue.toLocaleString('en-MY', { maximumFractionDigits: 0 }), icon: '💰' },
        { label: 'Categories', value: new Set(items.map(i => i.category).filter(Boolean)).size, icon: '🏷️' },
      ].map(c => (
        <div key={c.label} className="card">
          <p className="text-gray-400 text-xs mb-1">{c.icon} {c.label}</p>
          <p className={`text-2xl font-bold ${c.cls || 'text-white'}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function ItemsTab() {
  const [showModal, setShowModal] = useState(false);
  const [showMovement, setShowMovement] = useState(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['inventory-items'], queryFn: () => api.get('/inventory/items').then(r => r.data) });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const movForm = useForm();

  const create = useMutation({
    mutationFn: d => api.post('/inventory/items', d),
    onSuccess: () => { qc.invalidateQueries(['inventory-items']); setShowModal(false); reset(); },
  });
  const movement = useMutation({
    mutationFn: d => api.post('/inventory/transactions', d),
    onSuccess: () => { qc.invalidateQueries(['inventory-items']); qc.invalidateQueries(['inventory-transactions']); setShowMovement(null); movForm.reset(); },
  });

  const items = (data?.items || []).filter(i => {
    const matchCat = category === 'All' || i.category === category;
    const matchSearch = !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.item_code?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <input className="input-field w-64" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === cat ? 'bg-gold text-navy-dark' : 'bg-navy-light text-gray-400 hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary ml-auto whitespace-nowrap">+ Add Item</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                <th className="text-left text-gray-400 font-medium py-3 px-4">Item</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Category</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Location</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Qty</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Unit</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Unit Cost</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Total Value</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Status</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-12">No inventory items found.</td></tr>
              ) : items.map(item => {
                const isLow = item.quantity <= (item.reorder_level || 0);
                const totalVal = parseFloat(item.quantity || 0) * parseFloat(item.unit_cost || 0);
                return (
                  <tr key={item.id} className="border-b border-navy-light/50 hover:bg-navy-light/30">
                    <td className="py-3 px-4">
                      <p className="text-white font-medium">{item.name}</p>
                      {item.item_code && <p className="text-xs text-gray-500 font-mono">{item.item_code}</p>}
                    </td>
                    <td className="py-3 px-4"><span className="text-xs bg-navy-light text-gray-300 px-2 py-0.5 rounded-full">{item.category || '—'}</span></td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{item.location || '—'}</td>
                    <td className={`py-3 px-4 text-right font-bold ${isLow ? 'text-yellow-400' : 'text-white'}`}>{item.quantity}</td>
                    <td className="py-3 px-4 text-gray-400">{item.unit}</td>
                    <td className="py-3 px-4 text-right text-gray-400">RM {parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-gold">RM {totalVal.toLocaleString('en-MY', { maximumFractionDigits: 0 })}</td>
                    <td className="py-3 px-4">
                      {isLow ? <span className="badge-warning">⚠ Low Stock</span> : <span className="badge-success">OK</span>}
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => setShowMovement(item)} className="text-xs text-gold hover:underline">In/Out</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add item modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-5">Add Inventory Item</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Item Name</label>
                  <input className="input-field" placeholder="e.g. OPC Cement 50kg" {...register('name', { required: true })} />
                </div>
                <div>
                  <label className="label">Item Code (optional)</label>
                  <input className="input-field" placeholder="e.g. CEM-001" {...register('item_code')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select className="input-field" {...register('category')}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input-field" {...register('unit', { required: true })}>
                    {['bag', 'unit', 'pcs', 'm', 'm²', 'm³', 'kg', 'tonne', 'litre', 'box', 'roll', 'set', 'pair'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Opening Qty</label>
                  <input type="number" step="0.01" className="input-field" placeholder="0" {...register('quantity')} />
                </div>
                <div>
                  <label className="label">Reorder Level</label>
                  <input type="number" step="0.01" className="input-field" placeholder="10" {...register('reorder_level')} />
                </div>
                <div>
                  <label className="label">Unit Cost (RM)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="0.00" {...register('unit_cost')} />
                </div>
              </div>
              <div>
                <label className="label">Storage Location</label>
                <input className="input-field" placeholder="e.g. Site Store — Block A" {...register('location')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : 'Add Item'}</button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {showMovement && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-1">Stock Movement</h2>
            <p className="text-gray-400 text-sm mb-5">{showMovement.name} — Current: <span className="text-gold font-bold">{showMovement.quantity} {showMovement.unit}</span></p>
            <form onSubmit={movForm.handleSubmit(d => movement.mutate({ ...d, inventory_item_id: showMovement.id }))} className="space-y-4">
              <div>
                <label className="label">Transaction Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 rounded-lg border border-navy-light cursor-pointer has-[:checked]:border-success has-[:checked]:bg-success/10">
                    <input type="radio" value="in" {...movForm.register('transaction_type', { required: true })} className="accent-green-500" />
                    <span className="text-sm text-white">📥 Stock In</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border border-navy-light cursor-pointer has-[:checked]:border-gold has-[:checked]:bg-gold/10">
                    <input type="radio" value="out" {...movForm.register('transaction_type', { required: true })} className="accent-yellow-500" />
                    <span className="text-sm text-white">📤 Stock Out</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" step="0.01" className="input-field" placeholder="0" {...movForm.register('quantity', { required: true, min: 0.01 })} />
              </div>
              <div>
                <label className="label">Reference / Reason</label>
                <input className="input-field" placeholder="e.g. DO No. 12345, used at Block B level 3" {...movForm.register('reference')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={movement.isPending} className="btn-primary flex-1">
                  {movement.isPending ? 'Saving...' : 'Record Movement'}
                </button>
                <button type="button" onClick={() => { setShowMovement(null); movForm.reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function TransactionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => api.get('/inventory/transactions').then(r => r.data),
  });
  const txns = data?.transactions || [];

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-light">
            <th className="text-left text-gray-400 font-medium py-3 px-4">Date</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">Item</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">Type</th>
            <th className="text-right text-gray-400 font-medium py-3 px-4">Qty</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">Reference</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">By</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={6} className="text-center text-gray-500 py-12">Loading...</td></tr>
          ) : txns.length === 0 ? (
            <tr><td colSpan={6} className="text-center text-gray-500 py-12">No transactions recorded yet.</td></tr>
          ) : txns.map(t => (
            <tr key={t.id} className="border-b border-navy-light/50 hover:bg-navy-light/30">
              <td className="py-3 px-4 text-gray-400">{new Date(t.created_at).toLocaleDateString('en-MY')}</td>
              <td className="py-3 px-4 text-white">{t.item_name}</td>
              <td className="py-3 px-4">
                <span className={t.transaction_type === 'in' ? 'badge-success' : 'badge-warning'}>
                  {t.transaction_type === 'in' ? '📥 Stock In' : '📤 Stock Out'}
                </span>
              </td>
              <td className={`py-3 px-4 text-right font-bold ${t.transaction_type === 'in' ? 'text-success' : 'text-yellow-400'}`}>
                {t.transaction_type === 'in' ? '+' : '-'}{t.quantity}
              </td>
              <td className="py-3 px-4 text-gray-400">{t.reference || '—'}</td>
              <td className="py-3 px-4 text-gray-400">{t.created_by_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
