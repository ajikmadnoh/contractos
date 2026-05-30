import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Icon from '../../components/Icon';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return `RM ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `RM ${(v / 1_000).toFixed(0)}K`;
  return `RM ${v.toFixed(0)}`;
};

const pct = (a, b) => {
  const x = parseFloat(b);
  if (!x) return 0;
  return Math.min(100, Math.round((parseFloat(a) / x) * 100));
};

// ── Stage definitions ─────────────────────────────────────────────────────────
// Each stage has: id, label, icon, how to derive state from a pipeline row
const STAGES = [
  { id: 'lead',    label: 'Lead',         icon: 'target' },
  { id: 'project', label: 'Project',      icon: 'building' },
  { id: 'bq',      label: 'Tender / BQ',  icon: 'hash' },
  { id: 'claim',   label: 'Claimed',      icon: 'money' },
  { id: 'cert',    label: 'Certified',    icon: 'check' },
  { id: 'paid',    label: 'Paid',         icon: 'doc' },
];

// Derive which stage a project has reached
function maxStage(row) {
  if (parseFloat(row.paid_total) > 0)      return 'paid';
  if (parseInt(row.cert_count) > 0)        return 'cert';
  if (parseInt(row.claim_count) > 0)       return 'claim';
  if (parseInt(row.bq_count) > 0)          return 'bq';
  if (row.lead_id)                          return 'project'; // came from lead, now a project
  return 'project';
}

// Does the row have a CRM lead origin?
function hasLead(row) { return !!row.lead_id; }

// ── Stage pill ────────────────────────────────────────────────────────────────
const STAGE_TONE = {
  lead: 'info', project: 'accent', bq: 'warn',
  claim: 'accent', cert: 'good', paid: 'good',
};

function StagePip({ stage, active, reached }) {
  const bg = reached
    ? active ? 'var(--accent)' : 'var(--good)'
    : 'var(--border)';
  const color = reached ? '#fff' : 'var(--text-mute)';
  return (
    <div title={stage.label} style={{
      width: 22, height: 22, borderRadius: '50%',
      background: bg, color, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'background .2s',
    }}>
      <Icon name={stage.icon} size={10} />
    </div>
  );
}

// ── Pipeline bar (progress through stages) ────────────────────────────────────
function PipelineBar({ row }) {
  const max = maxStage(row);
  const maxIdx = STAGES.findIndex(s => s.id === max);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {STAGES.map((s, i) => {
        const reached = i <= maxIdx;
        const active  = i === maxIdx;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <StagePip stage={s} active={active} reached={reached} />
            {i < STAGES.length - 1 && (
              <div style={{
                width: 14, height: 2,
                background: i < maxIdx ? 'var(--good)' : 'var(--border)',
                borderRadius: 1, transition: 'background .2s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Funnel summary (how many projects at each stage) ─────────────────────────
function FunnelSummary({ rows }) {
  const counts = Object.fromEntries(STAGES.map(s => [s.id, 0]));
  rows.forEach(r => { counts[maxStage(r)]++; });
  const totalContractSum = rows.reduce((s, r) => s + parseFloat(r.contract_sum || 0), 0);
  const totalPaid        = rows.reduce((s, r) => s + parseFloat(r.paid_total || 0), 0);
  const totalClaimed     = rows.reduce((s, r) => s + parseFloat(r.claimed_total || 0), 0);
  const totalCertified   = rows.reduce((s, r) => s + parseFloat(r.certified_total || 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 10, marginBottom: 20 }}>
      {STAGES.map(s => (
        <div key={s.id} className="card" style={{ padding: '10px 14px', textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent-soft)', color: 'var(--accent-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Icon name={s.icon} size={14} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {counts[s.id]}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Collection rate mini-stat ─────────────────────────────────────────────────
function CollectionBar({ label, value, total, tone }) {
  const p = pct(value, total);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {fmt(value)} <span style={{ color: 'var(--text-mute)' }}>/ {fmt(total)}</span>
          <span style={{ marginLeft: 6, color: `var(--${tone || 'accent'})` }}>{p}%</span>
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
        <div style={{ height: '100%', width: `${p}%`, borderRadius: 2, background: `var(--${tone || 'accent'})`, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => api.get('/projects/pipeline').then(r => r.data),
    staleTime: 2 * 60_000,
  });

  // Totals for the summary panel
  const totalContractSum = rows.reduce((s, r) => s + parseFloat(r.contract_sum || 0), 0);
  const totalClaimed     = rows.reduce((s, r) => s + parseFloat(r.claimed_total || 0), 0);
  const totalCertified   = rows.reduce((s, r) => s + parseFloat(r.certified_total || 0), 0);
  const totalPaid        = rows.reduce((s, r) => s + parseFloat(r.paid_total || 0), 0);

  // Filter + search
  const filtered = rows
    .filter(r => {
      if (filterStage !== 'all' && maxStage(r) !== filterStage) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.name?.toLowerCase().includes(q)
          || r.project_number?.toLowerCase().includes(q)
          || r.pm_name?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'contract_sum') return parseFloat(b.contract_sum || 0) - parseFloat(a.contract_sum || 0);
      if (sortBy === 'paid_total')   return parseFloat(b.paid_total || 0) - parseFloat(a.paid_total || 0);
      if (sortBy === 'stage') {
        return STAGES.findIndex(s => s.id === maxStage(b)) - STAGES.findIndex(s => s.id === maxStage(a));
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <>
      {/* Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Commercial Pipeline</h1>
          <p className="page-sub">Lead → Project → BQ → Claim → Cert → Paid · {rows.length} project{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn primary" onClick={() => navigate('/dashboard/projects')}>
          <Icon name="building" size={14} /> All Projects
        </button>
      </div>

      <div className="page-body">

        {/* ── Funnel summary ── */}
        {rows.length > 0 && <FunnelSummary rows={rows} />}

        {/* ── Portfolio totals ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 13 }}>Revenue pipeline</h3>
            <CollectionBar label="Contract value"   value={totalContractSum} total={totalContractSum} tone="accent" />
            <CollectionBar label="Claimed to date"  value={totalClaimed}     total={totalContractSum} tone="info" />
            <CollectionBar label="Certified"        value={totalCertified}   total={totalContractSum} tone="warn" />
            <CollectionBar label="Collected (paid)" value={totalPaid}        total={totalContractSum} tone="good" />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 13 }}>Collection efficiency</h3>
            {[
              { label: 'Claim rate',        value: pct(totalClaimed, totalContractSum),   suffix: '% of contract claimed' },
              { label: 'Certification rate', value: pct(totalCertified, totalClaimed),     suffix: '% of claims certified' },
              { label: 'Collection rate',   value: pct(totalPaid, totalCertified),        suffix: '% of certs collected' },
              { label: 'Overall recovery',  value: pct(totalPaid, totalContractSum),       suffix: '% of contract paid' },
            ].map(k => (
              <div key={k.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{k.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14 }}>
                  {k.value}<span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 400 }}>%</span>
                  <span style={{ fontSize: 10, color: 'var(--text-mute)', marginLeft: 6, fontFamily: 'inherit', fontWeight: 400 }}>{k.suffix}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Filter row ── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 260, height: 32, fontSize: 13 }}
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="seg-toggle">
            <button aria-pressed={filterStage === 'all'}     onClick={() => setFilterStage('all')}>All ({rows.length})</button>
            {STAGES.map(s => {
              const n = rows.filter(r => maxStage(r) === s.id).length;
              if (!n) return null;
              return (
                <button key={s.id} aria-pressed={filterStage === s.id} onClick={() => setFilterStage(s.id)}>
                  {s.label} ({n})
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <select className="input" style={{ width: 'auto', height: 32, fontSize: 12 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="created_at">Sort: Newest</option>
            <option value="contract_sum">Sort: Contract value</option>
            <option value="paid_total">Sort: Paid</option>
            <option value="stage">Sort: Stage (furthest)</option>
          </select>
        </div>

        {/* ── Pipeline table ── */}
        <div className="card">
          {isLoading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-mute)', fontSize: 13 }}>
              Loading pipeline…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-mute)' }}>
              <Icon name="building" size={32} style={{ marginBottom: 12, opacity: .3 }} />
              <div style={{ fontSize: 13 }}>No projects match this filter.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>PM</th>
                    <th>Stage</th>
                    <th style={{ minWidth: 200 }}>Pipeline progress</th>
                    <th className="tbl-mono">Contract</th>
                    <th className="tbl-mono">Claimed</th>
                    <th className="tbl-mono">Certified</th>
                    <th className="tbl-mono">Paid</th>
                    <th className="tbl-mono">Recovery</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const stage = maxStage(row);
                    const recovery = pct(row.paid_total, row.contract_sum);
                    return (
                      <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/projects/${row.id}`)}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-mute)', fontFamily: 'JetBrains Mono, monospace' }}>{row.project_number}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{row.pm_name || '—'}</td>
                        <td>
                          <span className={`pill ${STAGE_TONE[stage]}`} style={{ fontSize: 10 }}>
                            {STAGES.find(s => s.id === stage)?.label}
                          </span>
                          {hasLead(row) && (
                            <span className="pill muted" style={{ fontSize: 10, marginLeft: 4 }} title="Originated from CRM lead">🎯 lead</span>
                          )}
                        </td>
                        <td><PipelineBar row={row} /></td>
                        <td className="tbl-mono" style={{ fontWeight: 600 }}>{fmt(row.contract_sum)}</td>
                        <td className="tbl-mono" style={{ color: parseFloat(row.claimed_total) > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                          {parseFloat(row.claimed_total) > 0 ? fmt(row.claimed_total) : '—'}
                        </td>
                        <td className="tbl-mono" style={{ color: parseFloat(row.certified_total) > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                          {parseFloat(row.certified_total) > 0 ? fmt(row.certified_total) : '—'}
                        </td>
                        <td className="tbl-mono" style={{ color: parseFloat(row.paid_total) > 0 ? 'var(--good)' : 'var(--text-mute)', fontWeight: parseFloat(row.paid_total) > 0 ? 600 : 400 }}>
                          {parseFloat(row.paid_total) > 0 ? fmt(row.paid_total) : '—'}
                        </td>
                        <td className="tbl-mono">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', minWidth: 48 }}>
                              <div style={{ height: '100%', width: `${recovery}%`, borderRadius: 2, background: recovery >= 80 ? 'var(--good)' : recovery >= 40 ? 'var(--accent)' : 'var(--warn)' }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', minWidth: 28, textAlign: 'right' }}>
                              {recovery}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <Icon name="chevR" size={12} style={{ color: 'var(--text-mute)' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {STAGES.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i === STAGES.length - 1 ? 'var(--good)' : i > 0 ? 'var(--accent)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={s.icon} size={7} style={{ color: i === 0 ? 'var(--text-mute)' : '#fff' }} />
              </div>
              {s.label}
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-mute)', marginLeft: 8 }}>· Click any row to open project detail</span>
        </div>

      </div>
    </>
  );
}
