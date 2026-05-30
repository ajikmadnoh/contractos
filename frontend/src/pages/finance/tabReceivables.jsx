// Finance · Receivables tab — aging matrix, dunning queue, payer scorecards,
// receivables-vs-target trend. Ported from the ConstructOS design.
import React from 'react';
import Icon from '../../components/Icon';
import { Legend, fmtShort, fmtNum } from './finCharts';
import { AR_MATRIX } from './finData';

export default function FinanceReceivables({ matrix }) {
  return (
    <>
      <div className="card rise rise-1">
        <div className="card-head">
          <h3>Aging matrix — project × bucket</h3>
          <span className="sub">Heat-shade by amount · click cell for drill-down</span>
          <div className="spacer" />
          <Legend items={[
            { label: 'Current', color: 'var(--good)' },
            { label: '1–30',    color: 'var(--info)' },
            { label: '31–60',   color: 'var(--warn)' },
            { label: '61–90',   color: 'var(--danger)' },
            { label: '90+',     color: 'var(--magenta)' },
          ]} />
        </div>
        <AgingMatrix matrix={matrix} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
        <div className="card rise rise-2" style={{ gridColumn: 'span 7' }}>
          <div className="card-head">
            <h3>Dunning queue</h3>
            <span className="sub">7 invoices flagged · auto-reminders staged</span>
            <div className="spacer" />
            <button className="btn sm"><Icon name="send" size={12} /> Send all reminders</button>
          </div>
          <DunningQueue />
        </div>
        <div className="card rise rise-3" style={{ gridColumn: 'span 5' }}>
          <div className="card-head"><h3>Payer scorecards</h3><span className="sub">Behaviour over last 12 months</span></div>
          <div className="card-body" style={{ padding: 0 }}><PayerScorecards /></div>
        </div>
      </div>

      <div className="card rise rise-4">
        <div className="card-head"><h3>Receivables vs target — last 12 months</h3><span className="sub">Target band 30–45 days DSO</span></div>
        <div className="card-body"><ReceivablesTrend /></div>
      </div>
    </>
  );
}

function AgingMatrix({ matrix }) {
  const data = matrix && matrix.length ? matrix : AR_MATRIX;
  const buckets = [
    { key: 'current', label: 'Current', color: 'var(--good)' },
    { key: 'b1_30',   label: '1–30 d',  color: 'var(--info)' },
    { key: 'b31_60',  label: '31–60 d', color: 'var(--warn)' },
    { key: 'b61_90',  label: '61–90 d', color: 'var(--danger)' },
    { key: 'b90',     label: '90+ d',   color: 'var(--magenta)' },
  ];
  const max = Math.max(1, ...data.flatMap(r => buckets.map(b => r[b.key] || 0)));
  const totals = buckets.map(b => data.reduce((s, r) => s + (r[b.key] || 0), 0));
  const grand = totals.reduce((s, x) => s + x, 0);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl" style={{ minWidth: 800 }}>
        <thead>
          <tr>
            <th>Project</th><th>Client</th>
            {buckets.map(b => (
              <th key={b.key} className="num" style={{ minWidth: 110 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />{b.label}
                </span>
              </th>
            ))}
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => {
            const total = buckets.reduce((s, b) => s + (r[b.key] || 0), 0);
            return (
              <tr key={r.code}>
                <td><span className="num" style={{ fontWeight: 700, fontSize: 11, padding: '2px 6px', background: 'var(--surface-3)', borderRadius: 4 }}>{r.code}</span></td>
                <td>{r.client}</td>
                {buckets.map(b => {
                  const v = r[b.key] || 0;
                  const intensity = v === 0 ? 0 : 0.12 + (v / max) * 0.72;
                  return (
                    <td key={b.key} className="num" style={{
                      background: v === 0 ? 'transparent' : `color-mix(in oklch, ${b.color} ${Math.round(intensity * 100)}%, var(--surface))`,
                      color: v === 0 ? 'var(--text-mute)' : (intensity > 0.5 ? 'white' : 'var(--text)'),
                      fontWeight: v > 0 ? 600 : 400, transition: 'background .3s', cursor: v > 0 ? 'pointer' : 'default',
                    }}>{v === 0 ? '—' : fmtShort(v)}</td>
                  );
                })}
                <td className="num" style={{ fontWeight: 700, background: 'var(--surface-2)' }}>{fmtShort(total)}</td>
              </tr>
            );
          })}
          <tr style={{ background: 'var(--surface-3)', borderTop: '2px solid var(--border-strong)' }}>
            <td colSpan={2} style={{ fontWeight: 700 }}>Total exposure</td>
            {totals.map((v, i) => <td key={i} className="num" style={{ fontWeight: 700 }}>{fmtShort(v)}</td>)}
            <td className="num" style={{ fontWeight: 800, fontSize: 13 }}>{fmtShort(grand)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DunningQueue() {
  const rows = [
    { id: 'INV-2026-0421', client: 'Pavilion Damansara',  proj: 'PVDH-T3', amt: 4_820_000, days: 7,  stage: 2, last: '11 May', next: 'WhatsApp + email reminder', action: 'Send' },
    { id: 'INV-2026-0398', client: 'DBKL · KL City Hall', proj: 'KLCC-EB', amt: 1_240_000, days: 35, stage: 3, last: '07 May', next: 'Phone — Mr Karim', action: 'Call' },
    { id: 'INV-2026-0387', client: 'DBKL · KL City Hall', proj: 'KLCC-EB', amt: 1_120_000, days: 62, stage: 4, last: '02 May', next: 'Formal demand letter', action: 'Letter' },
    { id: 'INV-2026-0341', client: 'Sutera Harbour',      proj: 'KKM-RES', amt: 931_000,   days: 91, stage: 5, last: '29 Apr', next: 'CIDB CIPAA notice', action: 'Escalate' },
    { id: 'INV-2026-0418', client: 'Putrajaya Holdings',  proj: 'PUTJ-OB', amt: 420_000,   days: 18, stage: 1, last: '12 May', next: 'Email — gentle reminder', action: 'Send' },
    { id: 'INV-2026-0354', client: 'Sutera Harbour',      proj: 'KKM-RES', amt: 320_000,   days: 78, stage: 4, last: '03 May', next: 'Formal demand letter', action: 'Letter' },
    { id: 'INV-2026-0408', client: 'Pavilion Damansara',  proj: 'PVDH-T3', amt: 280_000,   days: 12, stage: 1, last: '12 May', next: 'Email — gentle reminder', action: 'Send' },
  ];
  const stageLabel = (s) => ['—', 'Reminder 1', 'Reminder 2', 'Phone', 'Demand letter', 'CIPAA notice'][s] || '—';
  const stageTone = (s) => ['outline', 'info', 'warn', 'warn', 'danger', 'danger'][s];
  return (
    <table className="tbl">
      <thead>
        <tr><th>Invoice</th><th>Client</th><th>Project</th><th className="num">Amount</th><th>Aging</th><th>Stage</th><th>Next action</th><th></th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td className="num" style={{ fontWeight: 600, fontSize: 11.5 }}>{r.id}</td>
            <td>{r.client}</td>
            <td><span className="num" style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 5px', background: 'var(--surface-3)', borderRadius: 4 }}>{r.proj}</span></td>
            <td className="num" style={{ fontWeight: 600 }}>{fmtNum(r.amt)}</td>
            <td>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.days < 30 ? 'var(--info)' : r.days < 60 ? 'var(--warn)' : r.days < 90 ? 'var(--danger)' : 'var(--magenta)' }} />
                <span className="num">{r.days}d</span>
              </span>
            </td>
            <td><span className={`pill ${stageTone(r.stage)}`}>Stage {r.stage} · {stageLabel(r.stage)}</span></td>
            <td><div style={{ fontSize: 11.5 }}>{r.next}</div><div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>Last: {r.last}</div></td>
            <td><button className="btn sm">{r.action}</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayerScorecards() {
  const cards = [
    { code: 'MRCB', client: 'MRCB Land',            grade: 'A', score: 95, payDays: 22, onTime: 0.96, color: 'var(--good)' },
    { code: 'IWH',  client: 'Iskandar Waterfront',  grade: 'A', score: 84, payDays: 28, onTime: 0.88, color: 'var(--good)' },
    { code: 'TM1',  client: 'TM One',               grade: 'A', score: 95, payDays: 24, onTime: 0.94, color: 'var(--good)' },
    { code: 'PVD',  client: 'Pavilion Damansara',   grade: 'B', score: 72, payDays: 38, onTime: 0.74, color: 'var(--info)' },
    { code: 'PJH',  client: 'Putrajaya Holdings',   grade: 'B', score: 64, payDays: 44, onTime: 0.68, color: 'var(--warn)' },
    { code: 'DBKL', client: 'DBKL · KL City Hall',  grade: 'C', score: 38, payDays: 78, onTime: 0.41, color: 'var(--danger)' },
    { code: 'SHG',  client: 'Sutera Harbour Group', grade: 'D', score: 22, payDays: 96, onTime: 0.28, color: 'var(--magenta)' },
  ];
  return (
    <div>
      {cards.map((c, i) => (
        <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 60px', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < cards.length - 1 ? '1px solid var(--border)' : 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: c.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>{c.grade}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.client}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <div style={{ flex: 1, height: 4, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${c.score}%`, height: '100%', background: c.color }} />
              </div>
              <span className="num" style={{ fontSize: 10.5, color: 'var(--text-dim)', minWidth: 22, textAlign: 'right' }}>{c.score}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>{c.payDays}d</div>
            <div style={{ fontSize: 10, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Avg pay</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontSize: 13, fontWeight: 700, color: c.onTime > 0.7 ? 'var(--good)' : c.onTime > 0.5 ? 'var(--warn)' : 'var(--danger)' }}>{Math.round(c.onTime * 100)}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.04em' }}>On-time</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceivablesTrend() {
  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const dso = [52, 51, 49, 48, 47, 49, 51, 53, 50, 48, 46, 47];
  const total = [42.1, 41.8, 39.2, 38.4, 36.8, 38.4, 40.1, 42.6, 41.2, 40.4, 38.9, 39.8];
  const w = 1100, h = 200, p = { l: 40, r: 40, t: 10, b: 28 };
  const xAt = (i) => p.l + (i / (months.length - 1)) * (w - p.l - p.r);
  const yDso = (v) => p.t + (1 - (v - 30) / 60) * (h - p.t - p.b);
  const yAmt = (v) => p.t + (1 - (v - 30) / 25) * (h - p.t - p.b);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <rect x={p.l} y={yDso(45)} width={w - p.l - p.r} height={yDso(30) - yDso(45)} fill="var(--good)" opacity=".08" />
      {[30, 45, 60, 75, 90].map(v => (
        <g key={v}>
          <line x1={p.l} x2={w - p.r} y1={yDso(v)} y2={yDso(v)} stroke="var(--border)" strokeDasharray="2 4" />
          <text x={p.l - 6} y={yDso(v) + 3} fontSize="9.5" fill="var(--text-mute)" textAnchor="end" fontFamily="JetBrains Mono">{v}d</text>
        </g>
      ))}
      {[30, 40, 50].map(v => <text key={'r' + v} x={w - p.r + 6} y={yAmt(v) + 3} fontSize="9.5" fill="var(--text-mute)" textAnchor="start" fontFamily="JetBrains Mono">{v}M</text>)}
      <path d={`M ${xAt(0)} ${yAmt(0)} ` + total.map((v, i) => `L ${xAt(i)} ${yAmt(v)}`).join(' ') + ` L ${xAt(total.length - 1)} ${yAmt(0)} Z`} fill="var(--accent)" opacity=".08" />
      <path d={total.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ' ' + yAmt(v)).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="3 3" opacity=".7" />
      <path d={dso.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ' ' + yDso(v)).join(' ')} fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
      {dso.map((v, i) => <circle key={i} cx={xAt(i)} cy={yDso(v)} r="3" fill={v <= 45 ? 'var(--good)' : 'var(--surface)'} stroke="var(--text)" strokeWidth="1.5" />)}
      {months.map((m, i) => <text key={m} x={xAt(i)} y={h - 8} fontSize="9.5" fill="var(--text-mute)" textAnchor="middle">{m}</text>)}
    </svg>
  );
}
