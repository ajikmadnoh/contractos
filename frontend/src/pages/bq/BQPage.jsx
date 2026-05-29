import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';

const STATUS_STYLE = { draft:'bg-navy-light text-gray-400', submitted:'badge-warning', approved:'badge-success', archived:'bg-navy-light text-gray-500' };

export default function BQPage() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: bqs = [], isLoading } = useQuery({
    queryKey: ['bqs'],
    queryFn: () => api.get('/bq').then(r => r.data),
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tender / BQ</h1>
          <p className="page-sub">Bills of Quantities and tender documents</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn primary sm">+ New BQ</button>
      </div>
      <div className="page-body">

      {isLoading ? <p className="text-gray-400 text-sm">Loading...</p> : bqs.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-white font-semibold mb-2">No BQ documents yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first Bill of Quantities to start estimating.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">Create BQ</button>
        </div>
      ) : selected ? (
        <BQEditor bq={selected} onBack={() => setSelected(null)} onSaved={() => { setSelected(null); qc.invalidateQueries(['bqs']); }} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {bqs.map(bq => (
            <div key={bq.id} onClick={() => setSelected(bq)} className="card hover:border-gold transition-colors cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-gray-500">v{bq.version}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full ${STATUS_STYLE[bq.status]}`}>{bq.status}</span>
              </div>
              <h3 className="text-white font-semibold group-hover:text-gold transition-colors mb-1">{bq.title}</h3>
              {bq.project_name && <p className="text-gray-400 text-xs mb-2">📁 {bq.project_name}</p>}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-navy-light">
                <span>{bq.created_at ? format(new Date(bq.created_at), 'dd MMM yyyy') : '—'}</span>
                <span className="text-gold font-medium">RM {Number(bq.total_amount||0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewBQModal onClose={() => setShowNew(false)} onCreated={(bq) => { setShowNew(false); setSelected(bq); qc.invalidateQueries(['bqs']); }} />}
      </div>
    </>
  );
}

function NewBQModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:'', projectId:'' });
  const { data: projects = [] } = useQuery({ queryKey:['projects'], queryFn:()=>api.get('/projects').then(r=>r.data) });

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { const res = await api.post('/bq', form); onCreated(res.data); }
    catch (err) { alert(err.response?.data?.error||'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New BQ Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">BQ Title *</label>
            <input className="input-field" placeholder="e.g. Phase 1 Road Resurfacing" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
          </div>
          <div>
            <label className="label">Link to Project <span className="text-gray-500 font-normal">(optional)</span></label>
            <select className="input-field" value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
              <option value="">No project — standalone BQ</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Creating...':'Create BQ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BQEditor({ bq, onBack, onSaved }) {
  const [items, setItems] = useState(bq.items || []);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ description:'', unit:'', quantity:'', unitRate:'', section:'' });
  const set = (k,v) => setNewItem(n=>({...n,[k]:v}));

  const addItem = () => {
    if (!newItem.description) return;
    setItems(prev => [...prev, { ...newItem, amount: Number(newItem.quantity||0) * Number(newItem.unitRate||0), id: Date.now() }]);
    setNewItem({ description:'', unit:'', quantity:'', unitRate:'', section:'' });
  };

  const removeItem = (idx) => setItems(items.filter((_,i)=>i!==idx));
  const total = items.reduce((s,i) => s + Number(i.amount||0), 0);

  const handleSave = async () => {
    setSaving(true);
    try { await api.patch(`/bq/${bq.id}`, { items, totalAmount: total }); onSaved(); }
    catch (err) { alert(err.response?.data?.error||'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{bq.title}</h2>
          <p className="text-gray-400 text-xs">v{bq.version} · {bq.status}</p>
        </div>
        <div className="text-right mr-4">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-gold font-bold text-lg">RM {total.toLocaleString()}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Saving...':'Save BQ'}</button>
      </div>

      {/* Add item row */}
      <div className="card mb-5">
        <p className="text-sm font-medium text-white mb-3">Add Line Item</p>
        <div className="grid grid-cols-12 gap-2 mb-3">
          <input className="input-field col-span-4" placeholder="Section (optional)" value={newItem.section} onChange={e=>set('section',e.target.value)} />
          <input className="input-field col-span-4" placeholder="Description *" value={newItem.description} onChange={e=>set('description',e.target.value)} />
          <input className="input-field col-span-1" placeholder="Unit" value={newItem.unit} onChange={e=>set('unit',e.target.value)} />
          <input type="number" className="input-field col-span-1" placeholder="Qty" value={newItem.quantity} onChange={e=>set('quantity',e.target.value)} />
          <input type="number" className="input-field col-span-1" placeholder="Rate" value={newItem.unitRate} onChange={e=>set('unitRate',e.target.value)} />
          <button onClick={addItem} className="btn-primary col-span-1 text-sm">+</button>
        </div>
        {newItem.quantity && newItem.unitRate && (
          <p className="text-xs text-gold">Amount: RM {(Number(newItem.quantity)*Number(newItem.unitRate)).toLocaleString()}</p>
        )}
      </div>

      {/* Items table */}
      {items.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">No items yet. Add your first line item above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                {['Section','Description','Unit','Qty','Rate (RM)','Amount (RM)',''].map(h=>(
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-navy-light hover:bg-navy-light">
                  <td className="px-4 py-2 text-gray-500 text-xs">{item.section||'—'}</td>
                  <td className="px-4 py-2 text-white">{item.description}</td>
                  <td className="px-4 py-2 text-gray-400">{item.unit||'—'}</td>
                  <td className="px-4 py-2 text-gray-300">{item.quantity}</td>
                  <td className="px-4 py-2 text-gray-300">{Number(item.unitRate||0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-gold font-medium">{Number(item.amount||0).toLocaleString()}</td>
                  <td className="px-4 py-2"><button onClick={()=>removeItem(idx)} className="text-gray-500 hover:text-red-400 text-xs">✕</button></td>
                </tr>
              ))}
              <tr className="bg-navy">
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-white">Total</td>
                <td className="px-4 py-3 text-gold font-bold">RM {total.toLocaleString()}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
