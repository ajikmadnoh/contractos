import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';

const CLAIM_STATUS = { draft:'bg-navy-light text-gray-400', submitted:'badge-warning', under_review:'badge-warning', certified:'badge-success', paid:'badge-success', rejected:'badge-danger' };
const CERT_STATUS  = { pending:'badge-warning', certified:'badge-success', paid:'badge-success', overdue:'badge-danger' };

export default function FinancePage() {
  const [tab, setTab] = useState('claims');
  const qc = useQueryClient();

  const { data: claims = [], isLoading: loadingClaims } = useQuery({
    queryKey: ['claims'],
    queryFn: () => api.get('/finance/claims').then(r => r.data),
  });

  const { data: certs = [], isLoading: loadingCerts } = useQuery({
    queryKey: ['payment-certs'],
    queryFn: () => api.get('/finance/payment-certs').then(r => r.data),
  });

  const totalCertified = certs.filter(c => c.status !== 'paid').reduce((s, c) => s + Number(c.certified_amount || 0), 0);
  const overdueCount   = certs.filter(c => c.status === 'overdue').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance</h1>
          <p className="text-gray-400 text-sm mt-1">
            Unpaid certs: <span className="text-gold font-semibold">RM {totalCertified.toLocaleString()}</span>
            {overdueCount > 0 && <span className="text-red-400 ml-3">⚠ {overdueCount} overdue</span>}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Claims', value: claims.length, icon: '📋', color: 'border-gold' },
          { label: 'Payment Certs Pending', value: certs.filter(c => c.status === 'pending' || c.status === 'certified').length, icon: '📄', color: 'border-yellow-500' },
          { label: 'Overdue Certs', value: overdueCount, icon: '⚠️', color: 'border-danger-light' },
        ].map(card => (
          <div key={card.label} className={`card border-l-4 ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <span className="text-3xl opacity-60">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy rounded-lg p-1 mb-6 w-fit">
        {[{id:'claims',label:'Claims'},{id:'certs',label:'Payment Certificates'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-gold text-navy-dark' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'claims' && (
        <ClaimsTab claims={claims} loading={loadingClaims} onRefresh={() => qc.invalidateQueries(['claims'])} />
      )}
      {tab === 'certs' && (
        <CertsTab certs={certs} loading={loadingCerts} onRefresh={() => qc.invalidateQueries(['payment-certs'])} />
      )}
    </div>
  );
}

function ClaimsTab({ claims, loading, onRefresh }) {
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ claimType: 'progress', claimDate: '', amount: '', description: '' });

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) });

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/finance/claims', { ...form, projectId: form.projectId });
      setShowNew(false); onRefresh();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Claim</button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading...</p> : claims.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-white font-semibold mb-2">No claims yet</h3>
          <p className="text-gray-400 text-sm mb-6">Submit your first progress or full claim.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">New Claim</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                {['Claim #','Project','Type','Date','Amount','Status'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.map((c, i) => (
                <tr key={c.id} className={`border-b border-navy-light hover:bg-navy-light ${i%2===0?'':'bg-navy-dark bg-opacity-20'}`}>
                  <td className="px-6 py-3 font-mono text-xs text-gold">{c.claim_number}</td>
                  <td className="px-6 py-3 text-white">{c.project_name || '—'}</td>
                  <td className="px-6 py-3 text-gray-300 capitalize">{c.claim_type}</td>
                  <td className="px-6 py-3 text-gray-400">{c.claim_date ? format(new Date(c.claim_date), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-6 py-3 text-white font-medium">RM {Number(c.amount).toLocaleString()}</td>
                  <td className="px-6 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full ${CLAIM_STATUS[c.status]}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">New Claim</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Project</label>
                <select className="input-field" value={form.projectId} onChange={e => setForm(f=>({...f,projectId:e.target.value}))} required>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Claim Type</label>
                <select className="input-field" value={form.claimType} onChange={e => setForm(f=>({...f,claimType:e.target.value}))}>
                  <option value="progress">Progress Claim</option>
                  <option value="full">Full Claim (Final)</option>
                </select>
              </div>
              <div>
                <label className="label">Claim Date</label>
                <input type="date" className="input-field" value={form.claimDate} onChange={e => setForm(f=>({...f,claimDate:e.target.value}))} required />
              </div>
              <div>
                <label className="label">Claim Amount (RM)</label>
                <input type="number" className="input-field" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={2} className="input-field resize-none" placeholder="Work completed this period..." value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Submitting...':'Submit Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function CertsTab({ certs, loading, onRefresh }) {
  return loading ? <p className="text-gray-400 text-sm">Loading...</p> : certs.length === 0 ? (
    <div className="card text-center py-16">
      <div className="text-5xl mb-4">📄</div>
      <h3 className="text-white font-semibold mb-2">No payment certificates yet</h3>
      <p className="text-gray-400 text-sm">Payment certificates are generated when a claim is certified.</p>
    </div>
  ) : (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-light">
            {['Cert #','Project','Certified Amount','Due Date','Status'].map(h => (
              <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {certs.map((c,i) => (
            <tr key={c.id} className={`border-b border-navy-light hover:bg-navy-light ${i%2===0?'':'bg-navy-dark bg-opacity-20'}`}>
              <td className="px-6 py-3 font-mono text-xs text-gold">{c.cert_number}</td>
              <td className="px-6 py-3 text-white">{c.project_name || '—'}</td>
              <td className="px-6 py-3 text-white font-medium">RM {Number(c.certified_amount||0).toLocaleString()}</td>
              <td className="px-6 py-3 text-gray-400">{c.due_date ? format(new Date(c.due_date),'dd MMM yyyy') : '—'}</td>
              <td className="px-6 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full ${CERT_STATUS[c.status]}`}>{c.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
