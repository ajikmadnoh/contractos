// Finance · MyInvois (LHDN e-Invoicing) tab — status banner, submission buckets,
// compliance donut, recent submissions, supplier 3-way match, rejection causes.
// Ported from the ConstructOS design.
import React from 'react';
import Icon from '../../components/Icon';
import { Donut, DonutLegend, fmtShort, fmtNum } from './finCharts';
import { MYINVOIS_BUCKETS, MYINVOIS_RECENT } from './finData';

export default function FinanceMyInvois() {
  const total = MYINVOIS_BUCKETS.reduce((s, b) => s + b.count, 0);
  const amt = MYINVOIS_BUCKETS.reduce((s, b) => s + b.amount, 0);
  const validated = MYINVOIS_BUCKETS.find(b => b.kind === 'Validated');
  const successRate = (validated.count / total) * 100;

  return (
    <>
      <div className="card rise rise-1" style={{ background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 60%)', border: '1px solid var(--accent)' }}>
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)' }}>
            <Icon name="sparkles" size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              LHDN MyInvois e-Invoicing
              <span className="pill good" style={{ background: 'var(--good)', color: 'white' }}><Icon name="check" size={10} /> Connected</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
              Permata Bina Group · TIN <span className="num" style={{ fontWeight: 600 }}>C20881234560</span> · BRN <span className="num" style={{ fontWeight: 600 }}>201801012345</span> · Mandatory tier since 1 Jan 2026
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, paddingRight: 16 }}>
            <Stat value={total} label="Documents · 30d" />
            <Stat value={`${Math.round(successRate)}%`} label="Success rate" />
            <Stat value={fmtShort(amt)} label="Total value" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
        <div className="card rise rise-2" style={{ gridColumn: 'span 8' }}>
          <div className="card-head"><h3>Submission status</h3><span className="sub">Last 30 days</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid var(--border)' }}>
            {MYINVOIS_BUCKETS.map((b, i) => (
              <div key={b.kind} style={{ padding: '14px 16px', borderRight: i < 4 ? '1px solid var(--border)' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{b.kind}</div>
                </div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em' }}>{b.count}</div>
                <div className="num" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{fmtShort(b.amount)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card rise rise-3" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          <div className="card-head"><h3>Compliance by document type</h3></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
            <Donut segments={[
              { value: 184, color: 'var(--accent)' },
              { value: 38, color: 'var(--info)' },
              { value: 12, color: 'var(--magenta)' },
              { value: 8, color: 'var(--good)' },
            ]} size={130} thickness={18} label="242" sublabel="docs" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5 }}>
              <DonutLegend color="var(--accent)" label="Invoice" value="184" />
              <DonutLegend color="var(--info)" label="Credit note" value="38" />
              <DonutLegend color="var(--magenta)" label="Debit note" value="12" />
              <DonutLegend color="var(--good)" label="Self-billed" value="8" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
        <div className="card rise rise-4" style={{ gridColumn: 'span 7' }}>
          <div className="card-head">
            <h3>Recent submissions</h3>
            <span className="sub">UUID · IRN · validation result from LHDN</span>
            <div className="spacer" />
            <button className="btn sm ghost"><Icon name="refresh" size={12} /> Sync</button>
          </div>
          <MyInvoisRecent />
        </div>
        <div className="card rise rise-5" style={{ gridColumn: 'span 5' }}>
          <div className="card-head"><h3>Supplier matching</h3><span className="sub">3-way match: PO ↔ GRN ↔ supplier e-invoice</span></div>
          <SupplierMatch />
        </div>
      </div>

      <div className="card rise rise-6">
        <div className="card-head"><h3>Rejection causes — last 30d</h3><span className="sub">3 rejections · auto-fix suggestions</span></div>
        <div className="card-body" style={{ padding: 0 }}><RejectionCauses /></div>
      </div>
    </>
  );
}

function Stat({ value, label }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    </div>
  );
}

function MyInvoisRecent() {
  return (
    <table className="tbl">
      <thead>
        <tr><th>IRN / UUID</th><th>Type</th><th>Buyer · TIN</th><th className="num">Amount</th><th>Submitted</th><th>LHDN status</th></tr>
      </thead>
      <tbody>
        {MYINVOIS_RECENT.map(r => (
          <tr key={r.uuid}>
            <td>
              <div className="num" style={{ fontSize: 11.5, fontWeight: 700 }}>{r.irn}</div>
              <div className="num" style={{ fontSize: 9.5, color: 'var(--text-mute)' }}>{r.uuid}</div>
            </td>
            <td><span className="pill outline" style={{ fontSize: 10.5 }}>{r.kind}</span></td>
            <td><div style={{ fontSize: 12 }}>{r.to}</div><div className="num" style={{ fontSize: 10, color: 'var(--text-mute)' }}>{r.tin}</div></td>
            <td className="num" style={{ fontWeight: 600 }}>{r.amount < 0 ? '(' + fmtNum(Math.abs(r.amount)) + ')' : fmtNum(r.amount)}</td>
            <td className="num muted" style={{ fontSize: 11 }}>{r.time}</td>
            <td>
              {r.status === 'validated' && <span className="pill good"><Icon name="check" size={10} /> Validated</span>}
              {r.status === 'submitted' && <span className="pill info"><Icon name="clock" size={10} /> Submitted</span>}
              {r.status === 'pending' && <span className="pill warn"><Icon name="clock" size={10} /> Pending</span>}
              {r.status === 'rejected' && (
                <div>
                  <span className="pill danger"><Icon name="x" size={10} /> Rejected</span>
                  <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 3, maxWidth: 180 }}>{r.err}</div>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SupplierMatch() {
  const rows = [
    { invoice: 'INV-S-9821', supplier: 'Wira Steel & Glass',  state: 'matched',  pct: 100, note: 'PO + GRN matched' },
    { invoice: 'INV-S-9805', supplier: 'TMC Ready-Mix',       state: 'matched',  pct: 100, note: 'PO + GRN matched' },
    { invoice: 'INV-S-9788', supplier: 'PowerTec Electrical', state: 'mismatch', pct: 64,  note: 'Rate variance 8% vs PO' },
    { invoice: 'INV-S-9772', supplier: 'Hitachi Lifts',       state: 'pending',  pct: 50,  note: 'Awaiting GRN photo' },
    { invoice: 'INV-S-9722', supplier: 'Sime Darby Plumbing', state: 'mismatch', pct: 72,  note: 'Variation 7 not in PO' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => (
        <div key={r.invoice} style={{ padding: '11px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="num" style={{ fontSize: 11, fontWeight: 700 }}>{r.invoice}</span>
              {r.state === 'matched' && <span className="pill good" style={{ fontSize: 10 }}><Icon name="check" size={9} /> Match</span>}
              {r.state === 'mismatch' && <span className="pill danger" style={{ fontSize: 10 }}><Icon name="alert" size={9} /> Variance</span>}
              {r.state === 'pending' && <span className="pill warn" style={{ fontSize: 10 }}><Icon name="clock" size={9} /> Pending</span>}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 3 }}>{r.supplier}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{r.note}</div>
          </div>
          <div style={{ width: 80, textAlign: 'right' }}>
            <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ width: `${r.pct}%`, height: '100%', background: r.state === 'matched' ? 'var(--good)' : r.state === 'mismatch' ? 'var(--danger)' : 'var(--warn)' }} />
            </div>
            <div className="num" style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{r.pct}% match</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RejectionCauses() {
  const causes = [
    { code: 'CF364', title: 'TIN mismatch — buyer TIN not in MyTax registry', detail: 'IRN PB-2026-04126 · Putrajaya Holdings · C19872110984', fix: 'Re-fetch TIN from MyTax · or request updated TIN from buyer · Auto-fix available', tone: 'danger', count: 1 },
    { code: 'CF402', title: 'Classification code missing — SST exempted line items', detail: 'Line 4 of IRN PB-2026-04098 · service category not declared', fix: 'Apply CIDB construction code 022 · re-submit', tone: 'warn', count: 1 },
    { code: 'CF118', title: 'Date format — invoice date precedes issuance window (>72h)', detail: 'IRN PB-2026-04055 · backdated 4 days', fix: 'Cancel and re-issue with current date', tone: 'warn', count: 1 },
  ];
  return (
    <div>
      {causes.map((c, i) => (
        <div key={i} style={{ padding: '14px 18px', borderBottom: i < causes.length - 1 ? '1px solid var(--border)' : 0, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `var(--${c.tone}-soft)`, color: `var(--${c.tone})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="alert" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="num" style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 5px', background: 'var(--surface-3)', borderRadius: 4 }}>{c.code}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-dim)' }}>{c.count} occurrence</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{c.detail}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Icon name="sparkles" size={12} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 11.5 }}>{c.fix}</span>
              <button className="btn sm" style={{ marginLeft: 'auto' }}>Auto-fix</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
