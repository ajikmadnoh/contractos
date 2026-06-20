import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const TYPE_ICON = { subcon:'building', client:'handshake', supplier:'package', main_contractor:'building', organisation:'organisation' };
const TYPE_COLOUR = {
  subcon:'border-blue-500', client:'border-gold', supplier:'border-green-500',
  main_contractor:'border-purple-500', organisation:'border-gray-500',
};
const TYPE_LABEL = { client:'Client', subcon:'Subcontractor', supplier:'Supplier', main_contractor:'Main Contractor', organisation:'Organisation' };

const STATUS_PILL = { active:'var(--good)', on_hold:'var(--warn)', completed:'var(--info)', cancelled:'var(--danger)' };
const INV_STATUS_PILL = { paid:'var(--good)', unpaid:'var(--warn)', overdue:'var(--danger)', draft:'var(--text-mute)', partially_paid:'var(--info)' };

const fmtRM = v => 'RM ' + parseFloat(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 0 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function ProfilesPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', typeFilter],
    queryFn: () => api.get(`/profiles${typeFilter ? `?type=${typeFilter}` : ''}`).then(r => r.data),
  });

  // always fetch all for the summary strip counts (unfiltered)
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['profiles', ''],
    queryFn: () => api.get('/profiles').then(r => r.data),
    staleTime: 5 * 60_000,
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

      {/* Summary strip */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'Clients', type: 'client', icon: 'handshake' },
          { label: 'Subcontractors', type: 'subcon', icon: 'building' },
          { label: 'Suppliers', type: 'supplier', icon: 'package' },
          { label: 'Main Contractors', type: 'main_contractor', icon: 'building' },
          { label: 'Organisations', type: 'organisation', icon: 'organisation' },
        ].map(({ label, type, icon }) => {
          const count = allProfiles.filter(p => p.profile_type === type).length;
          const active = typeFilter === type;
          return (
            <button key={type} onClick={() => setTypeFilter(active ? '' : type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, border: '1px solid',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                cursor: 'pointer', padding: '5px 12px', borderRadius: 20,
                transition: 'all 0.15s ease'
              }}>
              <Icon name={icon} size={14} style={{ color: active ? 'var(--accent-2)' : 'var(--text-mute)' }} />
              <span style={{ fontSize: 12, color: active ? 'var(--accent-2)' : 'var(--text-mute)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--accent-2)' : 'var(--text)', minWidth: 16, textAlign: 'center' }}>{count}</span>
            </button>
          );
        })}
        {typeFilter && (
          <button onClick={() => setTypeFilter('')}
            style={{ border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', padding: '5px 12px', borderRadius: 20, fontSize: 12, color: 'var(--text-mute)' }}>
            × Clear filter
          </button>
        )}
      </div>

      <div className="page-body">
        {isLoading ? (
          <p style={{ color: 'var(--text-mute)', fontSize: 14 }}>Loading...</p>
        ) : profiles.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: 16, background: 'var(--surface-3)', 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 16px', color: 'var(--text-mute)' 
            }}>
              <Icon name="building" size={32} />
            </div>
            <h3 style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>No profiles yet</h3>
            <p style={{ color: 'var(--text-mute)', fontSize: 14, marginBottom: 24 }}>Add your clients, subcontractors and suppliers here.</p>
            <button onClick={() => setShowNew(true)} className="btn primary">Add First Profile</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {profiles.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`card border-l-4 ${TYPE_COLOUR[p.profile_type] || 'border-gray-500'}`}
                style={{ cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
              >
                <div className="flex items-start justify-between mb-3">
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                    width: 42, height: 42, borderRadius: 10, 
                    background: 'var(--surface-3)', color: 'var(--accent)',
                    flexShrink: 0 
                  }}>
                    <Icon name={TYPE_ICON[p.profile_type] || 'user'} size={20} />
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-mute)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 99 }}>
                    {TYPE_LABEL[p.profile_type] || p.profile_type}
                  </span>
                </div>
                <h3 style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 10 }}>{p.company_name}</h3>
                {p.contact_person && <p style={{ color: 'var(--text-mute)', fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="user" size={12} /> {p.contact_person}</p>}
                {p.email && <p style={{ color: 'var(--text-mute)', fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="send" size={12} /> {p.email}</p>}
                {p.phone && <p style={{ color: 'var(--text-mute)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="contacts" size={12} /> {p.phone}</p>}
                {p.registration_number && (
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)', fontFamily: 'monospace' }}>
                    {p.registration_number}
                  </p>
                )}
                {(p.project_count > 0 || p.invoice_count > 0 || p.cert_count > 0) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                    {p.project_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>
                        <Icon name="building" size={10} /> {p.project_count} project{p.project_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {p.invoice_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                        <Icon name="doc" size={10} /> {p.invoice_count} invoice{p.invoice_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {p.cert_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'var(--good-soft)', color: 'var(--good)' }}>
                        <Icon name="certificate" size={10} /> {p.cert_count} cert{p.cert_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showNew && (
          <NewProfileModal
            onClose={() => setShowNew(false)}
            onCreated={() => { setShowNew(false); qc.invalidateQueries(['profiles']); }}
          />
        )}

        {selectedId && (
          <ProfileDrawer
            profileId={selectedId}
            onClose={() => setSelectedId(null)}
            navigate={navigate}
          />
        )}
      </div>
    </>
  );
}

// ── Profile detail drawer ────────────────────────────────────────────────────

function ProfileDrawer({ profileId, onClose, navigate }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['profile-detail', profileId],
    queryFn: () => api.get(`/profiles/${profileId}/detail`).then(r => r.data),
    staleTime: 60_000,
  });

  const startEdit = (profile) => {
    setEditForm({
      companyName: profile.company_name || '',
      contactPerson: profile.contact_person || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
    });
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/profiles/${profileId}`, editForm);
      qc.invalidateQueries(['profile-detail', profileId]);
      qc.invalidateQueries(['profiles']);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const ef = (key) => ({
    value: editForm?.[key] || '',
    onChange: e => setEditForm(f => ({ ...f, [key]: e.target.value })),
  });

  const certDaysLeft = (expiry) => {
    if (!expiry) return null;
    return Math.floor((new Date(expiry) - new Date()) / 86400000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200,
          animation: 'fadeIn .15s ease',
        }}
      />
      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '95vw',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .2s ease',
      }}>
        {isLoading || !data ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mute)' }}>
            Loading…
          </div>
        ) : (() => {
          const { profile, projects, invoices, certs } = data;
          const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
          const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total || 0), 0);

          return (
            <>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                  width: 48, height: 48, borderRadius: 12, 
                  background: 'var(--accent-soft)', color: 'var(--accent-2)',
                  flexShrink: 0 
                }}>
                  <Icon name={TYPE_ICON[profile.profile_type] || 'user'} size={24} />
                </span>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{profile.company_name}</h2>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 99 }}>
                    {TYPE_LABEL[profile.profile_type] || profile.profile_type}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {!editing && (
                    <button onClick={() => startEdit(profile)}
                      style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent-2)', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
                </div>
              </div>

              {/* Contact info / edit form */}
              {editing ? (
                <form onSubmit={handleSave} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-mute)', display: 'block', marginBottom: 4 }}>Company Name</label>
                      <input className="input" style={{ width: '100%' }} {...ef('companyName')} required />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-mute)', display: 'block', marginBottom: 4 }}>Contact Person</label>
                      <input className="input" style={{ width: '100%' }} {...ef('contactPerson')} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-mute)', display: 'block', marginBottom: 4 }}>Email</label>
                      <input type="email" className="input" style={{ width: '100%' }} {...ef('email')} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-mute)', display: 'block', marginBottom: 4 }}>Phone</label>
                      <input className="input" style={{ width: '100%' }} {...ef('phone')} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-mute)', display: 'block', marginBottom: 4 }}>Address</label>
                    <textarea rows={2} className="input" style={{ width: '100%', resize: 'vertical' }} {...ef('address')} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={saving}
                      style={{ flex: 1, padding: '7px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)}
                      style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mute)', fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {profile.registration_number && (
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="doc" size={12} style={{ color: 'var(--text-mute)' }} /> {profile.registration_number}
                    </p>
                  )}
                  {profile.contact_person && (
                    <p style={{ fontSize: 13, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="user" size={13} style={{ color: 'var(--text-mute)' }} /> {profile.contact_person}
                    </p>
                  )}
                  {profile.email && (
                    <p style={{ fontSize: 13, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="send" size={13} style={{ color: 'var(--text-mute)' }} /> {profile.email}
                    </p>
                  )}
                  {profile.phone && (
                    <p style={{ fontSize: 13, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="contacts" size={13} style={{ color: 'var(--text-mute)' }} /> {profile.phone}
                    </p>
                  )}
                  {profile.address && (
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <Icon name="pin" size={13} style={{ color: 'var(--text-mute)', marginTop: 2 }} /> {profile.address}
                    </p>
                  )}
                </div>
              )}

              {/* Financial summary tiles */}
              {(invoices.length > 0) && (
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>Total Invoiced</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{fmtRM(totalInvoiced)}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 4 }}>Total Collected</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--good)' }}>{fmtRM(totalPaid)}</p>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Projects */}
                <section>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mute)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Projects ({projects.length})
                  </h3>
                  {projects.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No projects linked.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {projects.map(pr => (
                        <div
                          key={pr.id}
                          onClick={() => { onClose(); navigate(`/dashboard/projects/${pr.id}`); }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)',
                            cursor: 'pointer', border: '1px solid transparent', transition: 'border-color .15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pr.name}</p>
                            {pr.contract_sum && <p style={{ fontSize: 11, color: 'var(--text-mute)' }}>{fmtRM(pr.contract_sum)}</p>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                              background: 'rgba(255,255,255,.08)', color: STATUS_PILL[pr.status] || 'var(--text-mute)',
                            }}>
                              {pr.status?.replace('_', ' ') || '—'}
                            </span>
                            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>→</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Invoices */}
                <section>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mute)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Invoices ({invoices.length})
                  </h3>
                  {invoices.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No invoices raised.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {invoices.map(inv => (
                        <div key={inv.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)',
                        }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{inv.invoice_number}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtDate(inv.invoice_date)}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtRM(inv.total)}</p>
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: INV_STATUS_PILL[inv.status] || 'var(--text-mute)',
                            }}>
                              {inv.status?.replace('_', ' ') || '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Safety certs */}
                {certs.length > 0 && (
                  <section>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mute)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Safety Certifications ({certs.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {certs.map(cert => {
                        const days = certDaysLeft(cert.expiry_date);
                        const expired = days !== null && days < 0;
                        const expiring = days !== null && days >= 0 && days <= 60;
                        return (
                          <div key={cert.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)',
                          }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{cert.cert_type}</p>
                              {cert.holder_name && <p style={{ fontSize: 11, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="user" size={11} /> {cert.holder_name}</p>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {cert.expiry_date ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                                  background: expired ? 'var(--danger-soft)' : expiring ? 'var(--warn-soft)' : 'var(--good-soft)',
                                  color: expired ? 'var(--danger)' : expiring ? 'var(--warn)' : 'var(--good)',
                                }}>
                                  {expired ? (
                                    <><Icon name="x" size={10} /> Expired</>
                                  ) : expiring ? (
                                    <><Icon name="alert" size={10} /> {days}d left</>
                                  ) : (
                                    <><Icon name="check" size={10} /> {fmtDate(cert.expiry_date)}</>
                                  )}
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>No expiry</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            </>
          );
        })()}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ── New profile modal ────────────────────────────────────────────────────────

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
