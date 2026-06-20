import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const CATEGORIES = [
  'All',
  'Labour',
  'Materials',
  'Plant & Equipment',
  'Subcontract Works',
  'Professional Fees',
];

const UNITS = ['day', 'hour', 'm²', 'm³', 'kg', 'tonne', 'unit', 'lot', 'trip', 'month', 'lm', 'm'];

export default function MarketRatesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['market-rates'],
    queryFn: () => api.get('/rates').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const create = useMutation({
    mutationFn: d => api.post('/rates', d),
    onSuccess: () => { qc.invalidateQueries(['market-rates']); setShowModal(false); reset(); },
  });

  const rates = (data?.rates || []).filter(r => {
    const matchSearch = !search || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || r.category === category;
    return matchSearch && matchCat;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Market Rates</h1>
          <p className="page-sub">Labour, material and plant rates — your internal benchmark library</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn primary sm">+ Add Rate</button>
      </div>

      {/* Info banner */}
      <div style={{ margin: '16px 32px 0', background: 'var(--info-soft)', border: '1px solid var(--info)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Icon name="lightbulb" size={18} style={{ color: 'var(--info)', marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text)' }}>Your private rate library</p>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-dim)', marginTop: '2px' }}>
            Build your own benchmark library of labour, material and plant rates for BQ estimates. Private to your company.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ width: '260px' }}
          placeholder="Search rates…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="seg-toggle">
          {CATEGORIES.map(cat => (
            <button key={cat} className={`seg-btn${category === cat ? ' active' : ''}`} onClick={() => setCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">

      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : rates.length === 0 ? (
        <div className="card text-center py-16">
          <div style={{ 
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'var(--accent-soft)', color: 'var(--accent-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="trend" size={26} />
          </div>
          <p className="text-white font-medium">
            {search || category !== 'All' ? 'No rates match your search' : 'No rates added yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search || category !== 'All' ? 'Try adjusting your filters.' : 'Start building your benchmark rate library.'}
          </p>
          {!search && category === 'All' && (
            <button onClick={() => setShowModal(true)} className="btn primary mt-4">Add First Rate</button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                <th className="text-left text-gray-400 font-medium py-3 px-4">Description</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Category</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Unit</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Min Rate (RM)</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Max Rate (RM)</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Our Rate (RM)</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(rate => (
                <tr key={rate.id} className="border-b border-navy-light/50 hover:bg-navy-light/30">
                  <td className="py-3 px-4 text-white font-medium">{rate.description}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-navy-light text-gray-300 px-2 py-0.5 rounded-full">{rate.category}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">/{rate.unit}</td>
                  <td className="py-3 px-4 text-right text-gray-400">{rate.min_rate ? parseFloat(rate.min_rate).toFixed(2) : '—'}</td>
                  <td className="py-3 px-4 text-right text-gray-400">{rate.max_rate ? parseFloat(rate.max_rate).toFixed(2) : '—'}</td>
                  <td className="py-3 px-4 text-right text-gold font-semibold">{parseFloat(rate.our_rate || rate.min_rate || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{rate.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-5">Add Market Rate</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Description</label>
                <input className="input-field" placeholder="e.g. General Worker, Ready Mix Concrete Grade 30" {...register('description', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select className="input-field" {...register('category', { required: true })}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input-field" {...register('unit', { required: true })}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Min Rate (RM)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="0.00" {...register('min_rate')} />
                </div>
                <div>
                  <label className="label">Max Rate (RM)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="0.00" {...register('max_rate')} />
                </div>
                <div>
                  <label className="label">Our Rate (RM)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="0.00" {...register('our_rate')} />
                </div>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input className="input-field" placeholder="e.g. Klang Valley rate, Q1 2025" {...register('notes')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : 'Add Rate'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
