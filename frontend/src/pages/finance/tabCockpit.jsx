// Finance · Cockpit tab — KPI rail, 13-week cashflow, exposures, DSO, action
// queue, statutory ledger and month-end close. Ported from the ConstructOS design.
import React from 'react';
import Icon from '../../components/Icon';
import { KpiTile, Sparkline, Legend, fmtShort, fmtNum, fmtDateShort } from './finCharts';
import { AR_MATRIX, CASHFLOW_13W, CASH_BALANCE_START, STATUTORY } from './finData';

export default function FinanceCockpit({ live = {}, statutory }) {
  const rows = statutory && statutory.length ? statutory : STATUTORY;
  const k = live.kpis || {};
  return (
    <>
      {/* KPI rail */}
      <div className="kpi-grid rise rise-1" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <KpiTile label="Cash on hand"    value={k.cash || 'RM 18.4M'}        foot="3 banks · 7-day burn 4.2M" delta="+2.1%"   tone="good"
                 spark={<Sparkline data={[14, 15, 15.5, 16.8, 17.1, 17.8, 18.4]} color="var(--good)" />} />
        <KpiTile label="Receivables"     value={k.receivables || 'RM 39.8M'} foot={k.receivablesFoot || '58 invoices · DSO 47d'} delta="-3d" tone="good"
                 spark={<Sparkline data={[52, 49, 46, 44, 42, 40, 39.8]} color="var(--accent)" />} />
        <KpiTile label="Payables"        value={k.payables || 'RM 12.8M'}    foot="42 invoices · 14d to clear" delta="+1.4%" tone="warn"
                 spark={<Sparkline data={[10, 10.5, 11, 11.4, 12, 12.4, 12.8]} color="var(--warn)" />} />
        <KpiTile label="Retention held"  value={k.retention || 'RM 15.4M'}   foot={k.retentionFoot || 'On 7 contracts · 4.2% wt'} delta="+RM 0.6M" tone="info"
                 spark={<Sparkline data={[12, 13, 13.5, 14, 14.4, 14.8, 15.4]} color="var(--info)" />} />
        <KpiTile label="Net working cap" value={k.nwc || 'RM 45.4M'}         foot="Forecast 90d: RM 51.2M" delta="+4.8%" tone="good"
                 spark={<Sparkline data={[40, 41, 42, 43.5, 44.1, 44.6, 45.4]} color="var(--magenta)" />} />
      </div>

      {/* 13-week cashflow */}
      <div className="card rise rise-2">
        <div className="card-head">
          <h3>13-week rolling cashflow</h3>
          <span className="sub">Inflows certified + invoiced · Outflows payroll + suppliers · Running balance</span>
          <div className="spacer" />
          <Legend items={[
            { label: 'In · certified', color: 'var(--accent)' },
            { label: 'In · invoiced',  color: 'var(--info)' },
            { label: 'Out',            color: 'var(--danger)' },
            { label: 'Cash balance',   color: 'var(--text)' },
          ]} />
        </div>
        <div className="card-body"><CashflowForecast /></div>
      </div>

      {/* Top exposures + DSO + Action queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
        <div className="card rise rise-3" style={{ gridColumn: 'span 5' }}>
          <div className="card-head"><h3>Top exposures</h3><span className="sub">By client · outstanding + risk score</span></div>
          <div className="card-body" style={{ padding: 0 }}><TopExposures /></div>
        </div>
        <div className="card rise rise-4" style={{ gridColumn: 'span 4' }}>
          <div className="card-head"><h3>DSO trend by project</h3><span className="sub">Days sales outstanding · last 6 months</span></div>
          <div className="card-body"><DSOTrend /></div>
        </div>
        <div className="card rise rise-5" style={{ gridColumn: 'span 3' }}>
          <div className="card-head"><h3>Action queue</h3><span className="sub">{(live.actions || DEFAULT_ACTIONS).length} items</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(live.actions || DEFAULT_ACTIONS).map((a, i) => <ActionRow key={i} {...a} />)}
          </div>
        </div>
      </div>

      {/* Statutory + month-end checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
        <div className="card rise rise-6" style={{ gridColumn: 'span 8' }}>
          <div className="card-head">
            <h3>Statutory ledger — current month</h3>
            <span className="sub">SST · CIDB · EPF · SOCSO · EIS · PCB · HRDF</span>
            <div className="spacer" />
            <span className="pill good"><Icon name="check" size={10} /> {rows.filter(s => s.status === 'paid').length} of {rows.length} filed</span>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Code</th><th>Filing</th><th>Period</th><th>Due</th><th className="num">Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.code}>
                  <td><span className="num" style={{ fontWeight: 700, fontSize: 11, padding: '2px 6px', background: 'var(--surface-3)', borderRadius: 4 }}>{s.code}</span></td>
                  <td>{s.label}</td>
                  <td className="muted">{s.period}</td>
                  <td>{['2026-05-30', '2026-05-31'].includes(s.due)
                    ? <span style={{ color: 'var(--warn)', fontWeight: 600 }}>{fmtDateShort(s.due)}</span>
                    : <span className="muted">{fmtDateShort(s.due)}</span>}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtNum(s.amount)}</td>
                  <td>
                    {s.status === 'paid' && <span className="pill good"><Icon name="check" size={10} /> Filed &amp; paid</span>}
                    {s.status === 'due'  && <span className="pill warn"><Icon name="clock" size={10} /> Due</span>}
                  </td>
                  <td className="muted num" style={{ fontSize: 11 }}>{s.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card rise rise-6" style={{ gridColumn: 'span 4' }}>
          <div className="card-head"><h3>Month-end close</h3><span className="sub">Apr 2026 · 5 of 8 steps complete</span></div>
          <div className="card-body" style={{ padding: 0 }}><MonthEndChecklist /></div>
        </div>
      </div>
    </>
  );
}

const DEFAULT_ACTIONS = [
  { icon: 'alert',  tone: 'danger', title: 'PC#14 over-claim',        sub: 'Reinforcement T20 — 25t variance', cta: 'Review' },
  { icon: 'money',  tone: 'warn',   title: 'INV-2026-0421 overdue',   sub: 'Pavilion · RM 4.82M — reminder due', cta: 'Send' },
  { icon: 'shield', tone: 'warn',   title: 'ISKP-2 bond expiring',    sub: 'Maybank · 130d to expiry', cta: 'Renew' },
  { icon: 'doc',    tone: 'info',   title: 'SST return Apr 2026',     sub: 'RM 1.42M due 30 May', cta: 'File' },
];

function CashflowForecast() {
  const data = CASHFLOW_13W;
  const w = 1100, h = 280, p = { l: 44, r: 12, t: 14, b: 36 };
  const bal = []; let acc = CASH_BALANCE_START;
  data.forEach((d) => { const net = d.inCert + d.inInv - d.out; bal.push(acc); acc += net * 0.3; });
  bal.push(acc);
  const max = 12, balMax = 32;
  const xAt = (i) => p.l + (i / (data.length - 1)) * (w - p.l - p.r);
  const yAt = (v) => p.t + (1 - v / max) * (h - p.t - p.b);
  const yBal = (v) => p.t + (1 - v / balMax) * (h - p.t - p.b);
  const colW = (w - p.l - p.r) / data.length - 6;
  const committedEnd = data.findIndex(d => d.conf === 'projected');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <defs>
        <pattern id="forecastHash" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y="0" x2="0" y2="6" stroke="var(--border-strong)" strokeWidth="1" opacity="0.4" />
        </pattern>
      </defs>
      {committedEnd > -1 && (
        <rect x={xAt(committedEnd) - colW / 2} y={p.t} width={(w - p.r) - (xAt(committedEnd) - colW / 2)} height={h - p.t - p.b} fill="url(#forecastHash)" opacity=".4" />
      )}
      {[0, 3, 6, 9, 12].map(v => (
        <g key={v}>
          <line x1={p.l} x2={w - p.r} y1={yAt(v)} y2={yAt(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 ? '' : '2 4'} />
          <text x={p.l - 8} y={yAt(v) + 3} fontSize="10" fill="var(--text-mute)" textAnchor="end" fontFamily="JetBrains Mono">{v}M</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = xAt(i) - colW / 2;
        const yI = yAt(d.inCert + d.inInv);
        const hI = yAt(0) - yI;
        return (
          <g key={d.wk}>
            <rect x={x} y={yI} width={colW} height={hI * (d.inCert / (d.inCert + d.inInv))} fill="var(--accent)" opacity={d.conf === 'projected' ? 0.6 : 1} rx="2" />
            <rect x={x} y={yI + hI * (d.inCert / (d.inCert + d.inInv))} width={colW} height={hI * (d.inInv / (d.inCert + d.inInv))} fill="var(--info)" opacity={d.conf === 'projected' ? 0.5 : 0.85} rx="2" />
            <line x1={x + colW / 2} x2={x + colW / 2} y1={yAt(0)} y2={yAt(0) + 12 * (d.out / 8)} stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      })}
      <path d={bal.slice(0, data.length).map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ' ' + yBal(v)).join(' ')} fill="none" stroke="var(--text)" strokeWidth="2" />
      {bal.slice(0, data.length).map((v, i) => <circle key={i} cx={xAt(i)} cy={yBal(v)} r="3" fill="var(--surface)" stroke="var(--text)" strokeWidth="1.5" />)}
      {data.map((d, i) => (
        <g key={d.wk}>
          <text x={xAt(i)} y={h - 18} fontSize="9.5" fill="var(--text-mute)" textAnchor="middle" fontFamily="JetBrains Mono">{d.wk}</text>
          <text x={xAt(i)} y={h - 6} fontSize="9.5" fill="var(--text-dim)" textAnchor="middle">{d.date}</text>
        </g>
      ))}
      <line x1={xAt(0.5)} x2={xAt(0.5)} y1={p.t} y2={h - p.b} stroke="var(--text-2)" strokeWidth="1" strokeDasharray="3 3" opacity=".5" />
      <rect x={xAt(0.5) - 18} y={p.t - 4} width="36" height="14" rx="3" fill="var(--text)" />
      <text x={xAt(0.5)} y={p.t + 6} fontSize="9.5" fill="var(--surface)" textAnchor="middle" fontWeight="700" letterSpacing=".04em">NOW</text>
      {committedEnd > -1 && <text x={xAt(committedEnd) + 8} y={p.t + 12} fontSize="10" fill="var(--text-dim)" fontStyle="italic">Projected</text>}
    </svg>
  );
}

function TopExposures() {
  const tot = (r) => r.current + r.b1_30 + r.b31_60 + r.b61_90 + r.b90;
  const sorted = [...AR_MATRIX].sort((a, b) => tot(b) - tot(a));
  const max = sorted.reduce((m, x) => Math.max(m, tot(x)), 0);
  return (
    <div>
      {sorted.slice(0, 5).map((r, i) => {
        const total = tot(r);
        const overdueShare = (r.b1_30 + r.b31_60 + r.b61_90 + r.b90) / total;
        return (
          <div key={r.code} style={{ padding: '12px 16px', borderBottom: i < 4 ? '1px solid var(--border)' : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="num" style={{ fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 700, padding: '1px 5px', background: 'var(--surface-3)', borderRadius: 4 }}>{r.code}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.client}</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 13 }}>{fmtShort(total)}</span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-2)' }}>
              <div style={{ width: `${(r.current / max) * 100}%`, background: 'var(--good)' }} />
              <div style={{ width: `${(r.b1_30 / max) * 100}%`, background: 'var(--info)' }} />
              <div style={{ width: `${(r.b31_60 / max) * 100}%`, background: 'var(--warn)' }} />
              <div style={{ width: `${(r.b61_90 / max) * 100}%`, background: 'var(--danger)' }} />
              <div style={{ width: `${(r.b90 / max) * 100}%`, background: 'var(--magenta)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-dim)' }}>
              <span>DSO <b style={{ color: r.dso > 60 ? 'var(--danger)' : r.dso > 40 ? 'var(--warn)' : 'var(--good)' }}>{r.dso}d</b></span>
              <span>Terms <span className="num">{r.terms}d</span></span>
              <span>Overdue <b style={{ color: overdueShare > 0.4 ? 'var(--danger)' : 'var(--text)' }}>{Math.round(overdueShare * 100)}%</b></span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="shield" size={10} /><span>Risk</span>
                <b style={{ color: r.riskScore > 70 ? 'var(--good)' : r.riskScore > 50 ? 'var(--warn)' : 'var(--danger)' }}>{r.riskScore}</b>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DSOTrend() {
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const series = [
    { code: 'PVDH-T3', color: 'var(--accent)',  data: [44, 42, 40, 39, 38, 38] },
    { code: 'ISKP-2',  color: 'var(--good)',    data: [36, 34, 33, 32, 31, 31] },
    { code: 'KLCC-EB', color: 'var(--danger)',  data: [62, 66, 70, 73, 76, 78] },
    { code: 'KKM-RES', color: 'var(--magenta)', data: [88, 90, 92, 94, 95, 96] },
  ];
  const w = 380, h = 180, p = { l: 28, r: 8, t: 8, b: 24 };
  const max = 110, min = 20;
  const xAt = (i) => p.l + (i / (months.length - 1)) * (w - p.l - p.r);
  const yAt = (v) => p.t + (1 - (v - min) / (max - min)) * (h - p.t - p.b);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      {[30, 60, 90].map(v => (
        <g key={v}>
          <line x1={p.l} x2={w - p.r} y1={yAt(v)} y2={yAt(v)} stroke="var(--border)" strokeDasharray="2 4" />
          <text x={p.l - 6} y={yAt(v) + 3} fontSize="9.5" fill="var(--text-mute)" textAnchor="end" fontFamily="JetBrains Mono">{v}d</text>
        </g>
      ))}
      <rect x={p.l} y={yAt(45)} width={w - p.l - p.r} height={yAt(20) - yAt(45)} fill="var(--good)" opacity=".05" />
      <rect x={p.l} y={yAt(75)} width={w - p.l - p.r} height={yAt(45) - yAt(75)} fill="var(--warn)" opacity=".05" />
      <rect x={p.l} y={p.t} width={w - p.l - p.r} height={yAt(75) - p.t} fill="var(--danger)" opacity=".05" />
      {series.map(s => {
        const d = s.data.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ' ' + yAt(v)).join(' ');
        return (
          <g key={s.code}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx={xAt(s.data.length - 1)} cy={yAt(s.data[s.data.length - 1])} r="3" fill={s.color} stroke="var(--surface)" strokeWidth="1.5" />
            <text x={xAt(s.data.length - 1) + 6} y={yAt(s.data[s.data.length - 1]) + 3} fontSize="9.5" fontWeight="700" fill={s.color}>{s.code}</text>
          </g>
        );
      })}
      {months.map((m, i) => <text key={m} x={xAt(i)} y={h - 8} fontSize="9.5" fill="var(--text-mute)" textAnchor="middle">{m}</text>)}
    </svg>
  );
}

function ActionRow({ icon, tone, title, sub, cta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: `var(--${tone}-soft)`, color: `var(--${tone})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
      </div>
      <button className="btn sm ghost" style={{ flexShrink: 0 }}>{cta}</button>
    </div>
  );
}

function MonthEndChecklist() {
  const items = [
    { label: 'Lock prior period (Mar 2026)', done: true,  who: 'Lim ML', when: '01 May' },
    { label: 'Reconcile bank statements',     done: true,  who: 'Aishah', when: '03 May' },
    { label: 'CVR — all 7 projects',          done: true,  who: 'PM team', when: '05 May' },
    { label: 'Sub-con valuations approved',   done: true,  who: 'QS team', when: '07 May' },
    { label: 'Accruals & WIP journal',        done: true,  who: 'Aishah', when: '09 May' },
    { label: 'PC#14 reviewed by Copilot',     done: false, who: 'Pending', when: '—' },
    { label: 'SST return + MyInvois batch',   done: false, who: 'Pending', when: '—' },
    { label: 'Director sign-off + lock',      done: false, who: 'Pending', when: '—' },
  ];
  const completed = items.filter(i => i.done).length;
  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(completed / items.length) * 100}%`, background: 'var(--accent)', transition: 'width .8s' }} />
        </div>
        <span className="num" style={{ fontSize: 12, fontWeight: 700 }}>{completed}/{items.length}</span>
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 0 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: it.done ? 'var(--good)' : 'var(--surface)', border: it.done ? '0' : '1px solid var(--border-strong)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {it.done && <Icon name="check" size={11} />}
          </div>
          <div style={{ fontSize: 12, color: it.done ? 'var(--text-dim)' : 'var(--text)', flex: 1, textDecoration: it.done ? 'line-through' : 'none', textDecorationColor: 'var(--text-mute)' }}>{it.label}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{it.who}</div>
          <div className="num" style={{ fontSize: 10.5, color: 'var(--text-mute)', width: 42, textAlign: 'right' }}>{it.when}</div>
        </div>
      ))}
    </div>
  );
}
