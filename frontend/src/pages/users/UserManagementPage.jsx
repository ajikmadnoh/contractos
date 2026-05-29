import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

const ROLES = ['director','admin','pm','qs','finance','hr','engineer','technician','officer','internal','subcon','client','supplier'];
const ROLE_COLOUR = { director:'text-gold', admin:'text-blue-400', pm:'text-purple-400', qs:'text-green-400', finance:'text-yellow-400', hr:'text-pink-400' };

export default function UserManagementPage() {
  const [showInvite, setShowInvite] = useState(false);
  const currentUser = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user? They will lose access immediately.')) return;
    try { await api.patch(`/users/${userId}/deactivate`); qc.invalidateQueries(['users']); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); }
  };

  const handleRoleChange = async (userId, role) => {
    try { await api.patch(`/users/${userId}/role`, { role }); qc.invalidateQueries(['users']); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); }
  };

  const activeUsers = users.filter(u => u.is_active);
  const inactiveUsers = users.filter(u => !u.is_active);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-1">{activeUsers.length} active user{activeUsers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary">+ Invite User</button>
      </div>

      {isLoading ? <p className="text-gray-400 text-sm">Loading...</p> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                {['User','Email','Role','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-navy-light ${!u.is_active ? 'opacity-50' : 'hover:bg-navy-light'} ${i%2===0?'':'bg-navy-dark bg-opacity-20'}`}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold bg-opacity-20 flex items-center justify-center text-gold font-bold text-xs">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-400">{u.email}</td>
                  <td className="px-6 py-3">
                    {u.id === currentUser?.id ? (
                      <span className={`text-xs font-medium capitalize ${ROLE_COLOUR[u.role] || 'text-gray-300'}`}>{u.role}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="bg-navy-light border border-navy-light text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-gold"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {u.email_verified
                      ? <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'badge-success' : 'bg-navy-light text-gray-500'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full badge-warning">Pending Verification</span>
                    }
                  </td>
                  <td className="px-6 py-3">
                    {u.id !== currentUser?.id && u.is_active && (
                      <button onClick={() => handleDeactivate(u.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={() => { setShowInvite(false); qc.invalidateQueries(['users']); }} />}
    </div>
  );
}

function InviteModal({ onClose, onInvited }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', role:'engineer' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/users/invite', form); onInvited(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to send invite.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Invite Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input-field" placeholder="Ahmad bin Ali" value={form.name} onChange={e=>set('name',e.target.value)} required />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input-field" placeholder="ahmad@company.com" value={form.email} onChange={e=>set('email',e.target.value)} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input-field" value={form.role} onChange={e=>set('role',e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500">An invitation email will be sent. They must verify their email to access the system.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Sending...':'Send Invite'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
