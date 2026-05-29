import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';

const STAGES = [
  { id: 'prospecting', label: 'Prospecting', color: 'bg-gray-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { id: 'tender_submitted', label: 'Tender Submitted', color: 'bg-yellow-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-purple-500' },
  { id: 'won', label: 'Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]));

const VIEW_LABELS = { kanban: 'Pipeline', list: 'List' };

export default function CRMPage() {
  const [view, setView] = useState('kanban');
  const [showModal, setShowModal] = useState(false);
  const [filterStage, setFilterStage] = useState('all');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: () => api.get('/crm/leads').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const create = useMutation({
    mutationFn: d => api.post('/crm/leads', d),
    onSuccess: () => { qc.invalidateQueries(['crm-leads']); setShowModal(false); reset(); },
  });
  const updateStage = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/crm/leads/${id}`, { stage }),
    onSuccess: () => qc.invalidateQueries(['crm-leads']),
  });

  const leads = data?.leads || [];

  const totalValue = leads.filter(l => l.stage !== 'lost').reduce((s, l) => s + parseFloat(l.estimated_value || 0), 0);
  const wonValue = leads.filter(l => l.stage === 'won').reduce((s, l) => s + parseFloat(l.estimated_value || 0), 0);
  const winRate = leads.length ? Math.round((leads.filter(l => l.stage === 'won').length / leads.filter(l => ['won', 'lost'].includes(l.stage)).length || 0) * 100) : 0;

  const fmt = v => 'RM ' + parseFloat(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 0 });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">CRM — Tender Pipeline</h1>
          <p className="page-sub">Track tenders, bids and project opportunities</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn primary sm">+ Add Opportunity</button>
      </div>

      {/* KPIs */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="kpi-grid">
          {[
            { label: 'Total Pipeline Value', value: fmt(totalValue) },
            { label: 'Won (This Year)', value: fmt(wonValue) },
            { label: 'Active Opportunities', value: leads.filter(l => !['won','lost'].includes(l.stage)).length },
            { label: 'Win Rate', value: `${winRate}%` },
          ].map(c => (
            <div key={c.label} className="kpi">
              <div className="kpi-label">{c.label}</div>
              <div className="kpi-value">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="seg-toggle">
          {['kanban', 'list'].map(v => (
            <button key={v} className={`seg-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        {view === 'list' && (
          <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="input" style={{ width: '180px' }}>
            <option value="all">All Stages</option>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}
      </div>

      <div className="page-body">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-mute)' }}>Loading…</div>
        ) : view === 'kanban' ? (
          <KanbanView leads={leads} onStageChange={(id, stage) => updateStage.mutate({ id, stage })} fmt={fmt} />
        ) : (
          <ListView leads={leads.filter(l => filterStage === 'all' || l.stage === filterStage)} fmt={fmt} onStageChange={(id, stage) => updateStage.mutate({ id, stage })} />
        )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-5">Add Tender Opportunity</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Project / Tender Name</label>
                <input className="input-field" placeholder="e.g. KL Sentral Mixed Development Tower B" {...register('title', { required: true })} />
              </div>
              <div>
                <label className="label">Client / Developer</label>
                <input className="input-field" placeholder="e.g. IJM Land Berhad" {...register('client_name')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Estimated Contract Value (RM)</label>
                  <input type="number" className="input-field" placeholder="5000000" {...register('estimated_value')} />
                </div>
                <div>
                  <label className="label">Tender Deadline</label>
                  <input type="date" className="input-field" {...register('tender_deadline')} />
                </div>
              </div>
              <div>
                <label className="label">Stage</label>
                <select className="input-field" {...register('stage')}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Project Type</label>
                <select className="input-field" {...register('project_type')}>
                  <option value="">Select type...</option>
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Industrial</option>
                  <option>Infrastructure</option>
                  <option>Renovation / Fit-Out</option>
                  <option>Government / Public Sector</option>
                  <option>Mixed Development</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea rows={2} className="input-field resize-none" placeholder="Key notes, contacts, requirements..." {...register('notes')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : 'Add Opportunity'}
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

function KanbanView({ leads, onStageChange, fmt }) {
  const activeStages = STAGES.filter(s => s.id !== 'lost');

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {activeStages.map(stage => {
        const stageLeads = leads.filter(l => l.stage === stage.id);
        const stageValue = stageLeads.reduce((s, l) => s + parseFloat(l.estimated_value || 0), 0);
        return (
          <div key={stage.id} className="flex-shrink-0 w-64">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <span className="text-sm font-medium text-gray-300">{stage.label}</span>
                <span className="text-xs bg-navy-light text-gray-400 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
              </div>
              <span className="text-xs text-gray-500">{fmt(stageValue)}</span>
            </div>
            <div className="space-y-3 min-h-24">
              {stageLeads.map(lead => (
                <div key={lead.id} className="card cursor-pointer hover:border-gold/40 border border-transparent transition-colors">
                  <p className="text-white text-sm font-medium leading-snug mb-1">{lead.title}</p>
                  <p className="text-gray-400 text-xs mb-2">{lead.client_name || '—'}</p>
                  <p className="text-gold text-sm font-bold">{fmt(lead.estimated_value)}</p>
                  {lead.tender_deadline && (
                    <p className="text-xs text-gray-500 mt-1">📅 {new Date(lead.tender_deadline).toLocaleDateString('en-MY')}</p>
                  )}
                  <select
                    value={lead.stage}
                    onChange={e => onStageChange(lead.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="mt-2 w-full text-xs bg-navy-dark border border-navy-light rounded px-2 py-1 text-gray-300">
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ leads, fmt, onStageChange }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-light">
            <th className="text-left text-gray-400 font-medium py-3 px-4">Opportunity</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">Client</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">Value</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">Deadline</th>
            <th className="text-left text-gray-400 font-medium py-3 px-4">Stage</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-gray-500 py-12">No opportunities found.</td></tr>
          ) : leads.map(lead => (
            <tr key={lead.id} className="border-b border-navy-light/50 hover:bg-navy-light/30">
              <td className="py-3 px-4">
                <p className="text-white font-medium">{lead.title}</p>
                {lead.project_type && <p className="text-xs text-gray-500">{lead.project_type}</p>}
              </td>
              <td className="py-3 px-4 text-gray-300">{lead.client_name || '—'}</td>
              <td className="py-3 px-4 text-gold font-medium">{fmt(lead.estimated_value)}</td>
              <td className="py-3 px-4 text-gray-400">{lead.tender_deadline ? new Date(lead.tender_deadline).toLocaleDateString('en-MY') : '—'}</td>
              <td className="py-3 px-4">
                <select value={lead.stage} onChange={e => onStageChange(lead.id, e.target.value)}
                  className="text-xs bg-navy-dark border border-navy-light rounded px-2 py-1 text-gray-300">
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
