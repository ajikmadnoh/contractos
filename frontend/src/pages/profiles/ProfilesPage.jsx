import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

const TYPE_ICON = { subcon:'🏗️', client:'🤝', supplier:'📦', main_contractor:'🏢', organisation:'🏛️' };
const TYPE_COLOUR = {
  subcon:'border-blue-500', client:'border-gold', supplier:'border-green-500',
  main_contractor:'border-purple-500', organisation:'border-gray-500',
};

export default function ProfilesPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', typeFilter],
    queryFn: () => api.get(`/profiles${typeFilter ? `?type=${typeFilter}` : ''}`).then(r => r.data),
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Profiles</h1>
          <p className="page-sub">Clients, subcontractors, suppliers and organisations</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn primary sm">+ New Profile</button>
      </div>

      {/* Type filter */}
      <div style={{ padding: '10px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['', 'client', 'subcon', 'supplier', 'main_contractor', 'organisation'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`seg-btn${typeFilter === t ? ' active' : ''}`}>
            {t === '' ? 'All' : `${TYPE_ICON[t]} ${t.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}`}
          </button>
        ))}
      </div>

      <div className="page-body">

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : profiles.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🏢</div>
          <h3 className="text-white font-semibold mb-2">No profiles yet</h3>
          <p className="text-gray-400 text-sm mb-6">Add your clients, subcontractors and suppliers here.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">Add First Profile</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {profiles.map(p => (
            <div key={p.id} className={`card border-l-4 ${TYPE_COLOUR[p.profile_type] || 'border-gray-500'} hover:border-gold transition-colors`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{TYPE_ICON[p.profile_type]}</span>
                <span className="text-xs text-gray-500 capitalize bg-navy-light px-2 py-0.5 rounded-full">
                  {p.profile_type.replace('_',' ')}
                </span>
              </div>
              <h3 className="text-white font-semibold mb-1">{p.company_name}</h3>
              {p.contact_person && <p className="text-gray-400 text-xs mb-1">👤 {p.contact_person}</p>}
              {p.email && <p className="text-gray-400 text-xs mb-1">✉️ {p.email}</p>}
              {p.phone && <p className="text-gray-400 text-xs">📞 {p.phone}</p>}
              {p.registration_number && (
                <p className="text-gray-500 text-xs mt-3 pt-3 border-t border-navy-light font-mono">{p.registration_number}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && <NewProfileModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); qc.invalidateQueries(['profiles']); }} />}
      </div>
    </>
  );
}

function NewProfileModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ profileType:'client', companyName:'', contactPerson:'', email:'', phone:'', registrationNumber:'', address:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/profiles', form); onCreated(); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Profile Type</label>
            <select className="input-field" value={form.profileType} onChange={e=>set('profileType',e.target.value)}>
              <option value="client">Client</option>
              <option value="subcon">Subcontractor</option>
              <option value="supplier">Supplier</option>
              <option value="main_contractor">Main Contractor</option>
              <option value="organisation">Organisation</option>
            </select>
          </div>
          <div>
            <label className="label">Company Name *</label>
            <input className="input-field" placeholder="Syarikat ABC Sdn Bhd" value={form.companyName} onChange={e=>set('companyName',e.target.value)} required />
          </div>
          <div>
            <label className="label">Registration Number <span className="text-gray-500 font-normal">(SSM/ROC)</span></label>
            <input className="input-field" placeholder="1234567-X" value={form.registrationNumber} onChange={e=>set('registrationNumber',e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input className="input-field" placeholder="Ahmad bin Ali" value={form.contactPerson} onChange={e=>set('contactPerson',e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" placeholder="+60 12-345 6789" value={form.phone} onChange={e=>set('phone',e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" placeholder="contact@company.com" value={form.email} onChange={e=>set('email',e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea rows={2} className="input-field resize-none" placeholder="No. 1, Jalan Binaan..." value={form.address} onChange={e=>set('address',e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':'Save Profile'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
