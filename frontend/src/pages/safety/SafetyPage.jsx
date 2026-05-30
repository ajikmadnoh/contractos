import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';

const TABS = [
  { id: 'incidents', label: 'Incidents', icon: '⚠️' },
  { id: 'certifications', label: 'Certifications', icon: '📜' },
  { id: 'toolbox', label: 'Toolbox Talks', icon: '🗣️' },
];

const SEVERITY = {
  near_miss: { label: 'Near Miss', cls: 'badge-warning' },
  minor: { label: 'Minor', cls: 'bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full' },
  major: { label: 'Major', cls: 'badge-danger' },
  fatal: { label: 'Fatal', cls: 'bg-red-800/60 text-red-200 text-xs px-2 py-0.5 rounded-full' },
};

const CERT_STATUS = {
  valid: 'badge-success',
  expiring_soon: 'badge-warning',
  expired: 'badge-danger',
};

export default function SafetyPage() {
  const [tab, setTab] = useState('incidents');

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Safety</h1>
          <p className="page-sub">DOSH / OSHA compliance — incidents, certifications & toolbox talks</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--good-soft)', border: '1px solid var(--good)', borderRadius: 'var(--radius-lg)', padding: '8px 16px' }}>
          <span>🛡️</span>
          <div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)' }}>Safety Score</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--good)' }}>94%</p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="kpi-grid">
          {[
            { label: 'Incidents (30d)', value: '2', color: 'var(--warn)' },
            { label: 'Lost Time Incidents', value: '0', color: 'var(--good)' },
            { label: 'Expiring Certs (60d)', value: '3', color: 'var(--warn)' },
            { label: 'Days Without Incident', value: '47', color: 'var(--good)' },
          ].map(c => (
            <div key={c.label} className="kpi">
              <div className="kpi-label">{c.label}</div>
              <div className="kpi-value" style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {tab === 'incidents' && <IncidentsTab />}
        {tab === 'certifications' && <CertificationsTab />}
        {tab === 'toolbox' && <ToolboxTab />}
      </div>
    </>
  );
}

function IncidentsTab() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['safety-incidents'],
    queryFn: () => api.get('/safety/incidents').then(r => r.data),
  });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const create = useMutation({
    mutationFn: d => api.post('/safety/incidents', d),
    onSuccess: () => { qc.invalidateQueries(['safety-incidents']); setShowModal(false); reset(); },
  });

  const incidents = data?.incidents || [];

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Report Incident</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : incidents.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-white font-medium">No incidents reported</p>
          <p className="text-gray-400 text-sm mt-1">Keep up the great work on site safety!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => (
            <div key={inc.id} className="card flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-white font-medium">{inc.title}</p>
                  <span className={SEVERITY[inc.severity]?.cls || 'badge-warning'}>{SEVERITY[inc.severity]?.label || inc.severity}</span>
                  {inc.lost_time && <span className="badge-danger">Lost Time</span>}
                </div>
                <p className="text-gray-400 text-sm">{inc.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>📅 {inc.incident_date ? new Date(inc.incident_date).toLocaleDateString('en-MY') : '—'}</span>
                  <span>📍 {inc.location || '—'}</span>
                  <span>👤 {inc.reported_by_name || '—'}</span>
                  {inc.corrective_action && <span>🔧 Action taken</span>}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${inc.status === 'closed' ? 'badge-success' : 'badge-warning'}`}>
                {inc.status === 'closed' ? 'Closed' : 'Open'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-5">Report Incident</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Incident Title</label>
                <input className="input-field" placeholder="e.g. Worker slipped on wet floor" {...register('title', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Severity</label>
                  <select className="input-field" {...register('severity', { required: true })}>
                    <option value="near_miss">Near Miss</option>
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="fatal">Fatal</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input-field" {...register('incident_date', { required: true })} />
                </div>
              </div>
              <div>
                <label className="label">Location on Site</label>
                <input className="input-field" placeholder="e.g. Level 3 — Block B" {...register('location')} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} className="input-field resize-none" placeholder="What happened?" {...register('description')} />
              </div>
              <div>
                <label className="label">Corrective Action Taken</label>
                <textarea rows={2} className="input-field resize-none" placeholder="What was done to fix it?" {...register('corrective_action')} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="lost_time" className="accent-gold" {...register('lost_time')} />
                <label htmlFor="lost_time" className="text-sm text-gray-300">Lost Time Incident (worker unable to return next day)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function CertificationsTab() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['safety-certs'],
    queryFn: () => api.get('/safety/certifications').then(r => r.data),
  });
  const { data: orgProfiles = [] } = useQuery({
    queryKey: ['profiles-orgs'],
    queryFn: () => api.get('/profiles').then(r =>
      (r.data || []).filter(p => ['subcon', 'organisation', 'main_contractor'].includes(p.profile_type))
    ),
    staleTime: 5 * 60_000,
  });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const create = useMutation({
    mutationFn: d => api.post('/safety/certifications', d),
    onSuccess: () => { qc.invalidateQueries(['safety-certs']); setShowModal(false); reset(); },
  });

  const certs = data?.certifications || [];

  const getCertStatus = (expiryDate) => {
    if (!expiryDate) return 'valid';
    const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
    if (days < 0) return 'expired';
    if (days <= 60) return 'expiring_soon';
    return 'valid';
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Certification</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                <th className="text-left text-gray-400 font-medium py-3 px-4">Certification</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Holder</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Cert No.</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Issue Date</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Expiry Date</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {certs.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-12">No certifications recorded yet.</td></tr>
              ) : certs.map(cert => {
                const status = getCertStatus(cert.expiry_date);
                const days = cert.expiry_date ? Math.floor((new Date(cert.expiry_date) - new Date()) / 86400000) : null;
                return (
                  <tr key={cert.id} className="border-b border-navy-light/50 hover:bg-navy-light/30">
                    <td className="py-3 px-4 text-white font-medium">{cert.cert_type}</td>
                    <td className="py-3 px-4">
                      <p className="text-gray-300">{cert.holder_name || '—'}</p>
                      {cert.profile_name && <p style={{ fontSize: 11, color: 'var(--text-mute)' }}>{cert.profile_name}</p>}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{cert.cert_number || '—'}</td>
                    <td className="py-3 px-4 text-gray-400">{cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-MY') : '—'}</td>
                    <td className="py-3 px-4 text-gray-400">{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-MY') : 'No Expiry'}</td>
                    <td className="py-3 px-4">
                      <span className={CERT_STATUS[status]}>
                        {status === 'expired' ? '✗ Expired' : status === 'expiring_soon' ? `⚠ ${days}d left` : '✓ Valid'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-5">Add Certification</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Certification Type</label>
                <select className="input-field" {...register('cert_type', { required: true })}>
                  <option value="">Select type...</option>
                  <option>CIDB Green Card</option>
                  <option>DOSH SHO Certificate</option>
                  <option>DOSH First Aid</option>
                  <option>Scaffolding Supervisor</option>
                  <option>Scaffolding Inspector</option>
                  <option>Lifting Supervisor</option>
                  <option>JKKP 8 — Accident Prevention</option>
                  <option>ISO 45001 Internal Auditor</option>
                  <option>Confined Space</option>
                  <option>Working at Height</option>
                  <option>Electrical (ST Licence)</option>
                  <option>Forklift Operator</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="label">Linked Company <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}>(optional)</span></label>
                <select className="input-field" {...register('profile_id')}>
                  <option value="">— No company linked —</option>
                  {orgProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Certificate Holder Name</label>
                <input className="input-field" placeholder="Full name of holder" {...register('holder_name')} />
              </div>
              <div>
                <label className="label">Certificate Number</label>
                <input className="input-field" placeholder="e.g. SHO/2023/001234" {...register('cert_number')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Issue Date</label>
                  <input type="date" className="input-field" {...register('issue_date')} />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input-field" {...register('expiry_date')} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : 'Save Certification'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ToolboxTab() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['toolbox-talks'],
    queryFn: () => api.get('/safety/toolbox').then(r => r.data),
  });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const create = useMutation({
    mutationFn: d => api.post('/safety/toolbox', d),
    onSuccess: () => { qc.invalidateQueries(['toolbox-talks']); setShowModal(false); reset(); },
  });

  const talks = data?.talks || [];

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Record Toolbox Talk</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : talks.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🗣️</p>
          <p className="text-white font-medium">No toolbox talks recorded</p>
          <p className="text-gray-400 text-sm mt-1">Record your daily safety briefings here.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Record First Talk</button>
        </div>
      ) : (
        <div className="space-y-3">
          {talks.map(talk => (
            <div key={talk.id} className="card flex items-start gap-4">
              <div className="text-3xl">🗣️</div>
              <div className="flex-1">
                <p className="text-white font-medium">{talk.topic}</p>
                <p className="text-gray-400 text-sm mt-0.5">{talk.summary}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>📅 {talk.talk_date ? new Date(talk.talk_date).toLocaleDateString('en-MY') : '—'}</span>
                  <span>👥 {talk.attendees_count || 0} attendees</span>
                  <span>👤 Conducted by {talk.conducted_by_name || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-5">Record Toolbox Talk</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Topic</label>
                <input className="input-field" placeholder="e.g. Working at Height Safety" {...register('topic', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input-field" {...register('talk_date', { required: true })} />
                </div>
                <div>
                  <label className="label">Number of Attendees</label>
                  <input type="number" className="input-field" min="1" {...register('attendees_count')} />
                </div>
              </div>
              <div>
                <label className="label">Summary / Key Points Discussed</label>
                <textarea rows={3} className="input-field resize-none" placeholder="Brief summary of what was covered..." {...register('summary')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : 'Save Talk'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
