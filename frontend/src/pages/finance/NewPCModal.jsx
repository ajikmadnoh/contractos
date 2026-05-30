// NewPCModal — Create a new progress claim (Payment Certificate request)
// Flow: pick project → preview scope breakdown → confirm claim date → generate
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Icon from '../../components/Icon';
import { fmtShort } from './finCharts';

const fmtRM = (v) =>
  'RM ' + Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function NewPCModal({ onClose }) {
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxRate, setTaxRate] = useState(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  // List all active projects for the dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects').then(r => r.data).catch(() => []),
  });

  // Preview the claim breakdown whenever projectId changes
  const {
    data: preview,
    isFetching: previewLoading,
    error: previewError,
  } = useQuery({
    queryKey: ['claim-preview', projectId],
    queryFn: () =>
      projectId
        ? api.get(`/finance/claims/preview/${projectId}`).then(r => r.data)
        : Promise.resolve(null),
    enabled: !!projectId,
    retry: false,
  });

  // Generate the claim
  const generate = useMutation({
    mutationFn: () =>
      api.post('/finance/claims/generate', { projectId, claimDate, taxRate: Number(taxRate), description: description || undefined })
        .then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-certs'] });
      qc.invalidateQueries({ queryKey: ['fin-cockpit'] });
      qc.invalidateQueries({ queryKey: ['fin-dunning'] });
      onClose();
    },
    onError: (err) => {
      setError(err?.response?.data?.error || 'Failed to generate claim. Please try again.');
    },
  });

  // Derive totals from preview + current tax rate
  const thisClaim = preview ? Number(preview.thisClaim) : 0;
  const taxAmount = thisClaim * (Number(taxRate) / 100);
  const net = preview ? Number(preview.netAmount) + taxAmount : 0;

  // Handle Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, width: '100%', maxWidth: 580,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="doc" size={15} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>New Progress Claim</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Generate from scope — quantities done to date</div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 20, lineHeight: 1, padding: 4 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Project selector */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Project *</span>
            <select
              value={projectId}
              onChange={e => { setProjectId(e.target.value); setError(null); }}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13.5,
                color: 'var(--text)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">— Select a project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          {/* Preview panel */}
          {projectId && (
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              {previewLoading && (
                <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                  Loading scope breakdown…
                </div>
              )}
              {previewError && (
                <div style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                  {previewError?.response?.data?.error || 'Could not load project scope.'}
                </div>
              )}
              {preview && !previewLoading && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[
                      { label: 'Cumulative to date', value: fmtShort(preview.cumulativeValue) },
                      { label: 'Previously claimed', value: fmtShort(preview.previousValue), dim: true },
                      { label: 'This claim', value: fmtShort(preview.thisClaim), accent: true },
                    ].map(k => (
                      <div key={k.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
                        <div style={{
                          fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                          color: k.accent ? 'var(--accent)' : k.dim ? 'var(--text-dim)' : 'var(--text)',
                        }}>{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Line items mini-table */}
                  {preview.lines && preview.lines.length > 0 && (
                    <div style={{ overflowY: 'auto', maxHeight: 180, borderRadius: 6, border: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-3)' }}>
                            {['Code', 'Description', 'Cum. Value', 'Prev.', 'This Claim'].map(h => (
                              <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Code' || h === 'Description' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.lines.map((l, i) => (
                            <tr key={l.scopeId} style={{ background: i % 2 ? 'transparent' : 'var(--surface-2)' }}>
                              <td style={{ padding: '4px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{l.itemCode || '—'}</td>
                              <td style={{ padding: '4px 8px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.description}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmtRM(l.cumulativeValue)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtRM(l.previousValue)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: l.thisValue > 0 ? 'var(--accent)' : 'var(--text-mute)' }}>{fmtRM(l.thisValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {preview.lines && preview.lines.length === 0 && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 12.5, textAlign: 'center', padding: '8px 0' }}>
                      No scope items have progress recorded. Record quantities done in the BQ/Scope tab first.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Claim date + tax rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Claim Date</span>
              <input
                type="date"
                value={claimDate}
                onChange={e => setClaimDate(e.target.value)}
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13.5,
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>SST / Tax (%)</span>
              <input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                min="0" max="100" step="0.5"
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13.5,
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </label>
          </div>

          {/* Description */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`Progress claim — work done to ${claimDate}`}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13.5,
                color: 'var(--text)', outline: 'none',
              }}
            />
          </label>

          {/* Net summary bar */}
          {preview && Number(preview.thisClaim) > 0 && (
            <div style={{
              background: 'color-mix(in oklch, var(--accent) 8%, var(--surface))',
              border: '1px solid color-mix(in oklch, var(--accent) 30%, var(--border))',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Retention <strong style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtRM(preview.retentionAmount)}</strong>
                </span>
                {Number(taxRate) > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    SST {taxRate}% <strong style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtRM(taxAmount)}</strong>
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>Net payable</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{fmtRM(net)}</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'color-mix(in oklch, var(--danger) 10%, var(--surface))', border: '1px solid color-mix(in oklch, var(--danger) 30%, var(--border))', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 8,
              padding: '8px 18px', fontSize: 13.5, color: 'var(--text-dim)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { setError(null); generate.mutate(); }}
            disabled={!projectId || !preview || Number(preview?.thisClaim) <= 0 || generate.isPending || previewLoading}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: 8,
              padding: '8px 22px', fontSize: 13.5, fontWeight: 600,
              color: '#fff', cursor: 'pointer', opacity: (!projectId || !preview || Number(preview?.thisClaim) <= 0 || generate.isPending) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            {generate.isPending ? (
              <>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Generating…
              </>
            ) : (
              <>
                <Icon name="plus" size={13} />
                Generate Claim
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spin keyframe (injected inline once — harmless duplication) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
