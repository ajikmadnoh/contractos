import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

const STATUS_COLOURS = {
  active: 'badge-success',
  on_hold: 'badge-warning',
  completed: 'text-xs px-2.5 py-0.5 rounded-full bg-navy-light text-gray-300',
  cancelled: 'badge-danger',
  pending_customer: 'badge-warning',
  pending_vendor: 'badge-warning',
  pending_payment: 'badge-danger',
};

const STATUS_LABELS = {
  active: 'Active', on_hold: 'On Hold', completed: 'Completed',
  cancelled: 'Cancelled', pending_customer: 'Pending Customer',
  pending_vendor: 'Pending Vendor', pending_payment: 'Pending Payment',
};

export default function ProjectsPage() {
  const [showNew, setShowNew] = useState(false);
  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Project</button>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-white font-semibold mb-2">No projects yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first project to get started.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">Create First Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p) => (
            <Link key={p.id} to={`/dashboard/projects/${p.id}`} className="card hover:border-gold transition-colors group block">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-gray-500 font-mono">{p.project_number}</span>
                <span className={STATUS_COLOURS[p.status] || 'badge-warning'}>
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
              <h3 className="text-white font-semibold group-hover:text-gold transition-colors mb-1 line-clamp-2">{p.name}</h3>
              {p.client_name && <p className="text-gray-400 text-xs mb-3">Client: {p.client_name}</p>}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-navy-light">
                <span>PM: {p.pm_name || '—'}</span>
                {p.open_tasks > 0 && <span className="text-gold">{p.open_tasks} open tasks</span>}
                {p.contract_sum && <span>RM {Number(p.contract_sum).toLocaleString()}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refetch(); }} />}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contractSum: '', startDate: '', endDate: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/projects', form);
      onCreated();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input className="input-field" placeholder="e.g. Jalan Binaan Resurfacing Phase 1"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Contract Sum (RM)</label>
            <input type="number" className="input-field" placeholder="e.g. 500000"
              value={form.contractSum} onChange={e => setForm(f => ({ ...f, contractSum: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input-field"
                value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input-field"
                value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
