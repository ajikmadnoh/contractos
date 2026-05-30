// Finance · Retention & Bonds tab — summary KPIs, release timeline, ledger,
// bonds/insurance, DLP diagram. Ported from the ConstructOS design.
import React from 'react';
import Icon from '../../components/Icon';
import { Legend, fmtShort, fmtDateLong } from './finCharts';
import { RETENTIONS, BONDS } from './finData';

export default function FinanceRetention({ ledger, bonds }) {
  const rows = ledger && ledger.length ? ledger : RETENTIONS;
  const bondList = bonds && bonds.length ? bonds : BONDS;
  const totalHeld = rows.reduce((s, r) => s + r.held, 0);
  const totalCap = rows.reduce((s, r) => s + r.cap, 0) || 1;
  const totalBonds = bondList.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <>
      <div className="kpi-grid rise rise-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi">
          <div className="kpi-label">Retention held</div>
          <div className="kpi-value">{fmtShort(totalHeld)}</div>
          <div className="kpi-foot"><span style={{ color: 'var(--text-dim)' }}>across {rows.length} contracts</span></div>
          <div style={{ position: 'absolute', right: 14, bottom: 12, width: 100, height: 5, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${(totalHeld / totalCap) * 100}%`, height: '100%', background: 'var(--info)' }} />
          </div>
          <div style={{ position: 'absolute', right: 14, bottom: 22, fontSize: 10, color: 'var(--text-mute)' }}>{Math.round((totalHeld / totalCap) * 100)}% of cap · {fmtShort(totalCap)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Half-release due (12mo)</div>
          <div className="kpi-value">{fmtShort(2_810_000 + 1_482_000 + 1_410_000)}</div>
          <div className="kpi-foot"><span className="delta up"><Icon name="arrowU" size={10} />3 projects</span><span style={{ color: 'var(--text-dim)' }}>KKM, KLCC, ISKP</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Performance bonds</div>
          <div className="kpi-value">{fmtShort(totalBonds)}</div>
          <div className="kpi-foot"><span className="delta" style={{ color: 'var(--warn)' }}><Icon name="alert" size={10} />1 expiring</span><span style={{ color: 'var(--text-dim)' }}>ISKP-2 · 130d</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">CAR insurance coverage</div>
          <div className="kpi-value">RM 184.5M</div>
          <div className="kpi-foot"><span style={{ color: 'var(--text-dim)' }}>Allianz · expires 15 Sep 2026</span></div>
        </div>
      </div>

      <div className="card rise rise-2">
        <div className="card-head">
          <h3>Retention release timeline</h3>
          <span className="sub">Half on PC issue · full on DLP expiry (12 months)</span>
          <div className="spacer" />
          <Legend items={[
            { label: 'Currently building', color: 'var(--accent)' },
            { label: 'Half release window', color: 'var(--warn)' },
            { label: 'DLP / full release', color: 'var(--good)' },
          ]} />
        </div>
        <div className="card-body" style={{ padding: 0 }}><RetentionTimeline rows={rows} /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
        <div className="card rise rise-3" style={{ gridColumn: 'span 7' }}>
          <div className="card-head"><h3>Retention ledger</h3><span className="sub">Held vs cap · half release · final release</span></div>
          <table className="tbl">
            <thead>
              <tr><th>Project</th><th className="num">Contract</th><th className="num">Held</th><th>Cap utilisation</th><th>Half release</th><th>Final (DLP)</th></tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const pct = (r.held / (r.cap || 1)) * 100;
                return (
                  <tr key={r.code}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="num" style={{ fontWeight: 700, fontSize: 11, padding: '2px 6px', background: 'var(--surface-3)', borderRadius: 4 }}>{r.code}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{r.project}</div>
                    </td>
                    <td className="num muted">{fmtShort(r.contract)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtShort(r.held)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: pct > 80 ? 'var(--warn)' : 'var(--accent)', transition: 'width .8s' }} />
                        </div>
                        <span className="num" style={{ fontSize: 11 }}>{Math.round(pct)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="num" style={{ fontSize: 11.5 }}>{fmtDateLong(r.halfRelease)}</span>
                      {r.phase === 'releasing' && <span className="pill warn" style={{ marginLeft: 6 }}>imminent</span>}
                      {r.phase === 'pc-soon' && <span className="pill info" style={{ marginLeft: 6 }}>3mo</span>}
                    </td>
                    <td className="num muted" style={{ fontSize: 11.5 }}>{fmtDateLong(r.finalRelease)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card rise rise-4" style={{ gridColumn: 'span 5' }}>
          <div className="card-head"><h3>Bonds &amp; insurance</h3><span className="sub">Performance · CAR · DLP</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {bondList.map((b, i) => {
              const daysToExpiry = Math.round((new Date(b.expires) - new Date('2026-05-20')) / 86400000);
              return (
                <div key={b.id || i} style={{ padding: '12px 16px', borderBottom: i < bondList.length - 1 ? '1px solid var(--border)' : 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: b.kind.includes('CAR') ? 'var(--info-soft)' : b.kind.includes('DLP') ? 'var(--magenta-soft)' : 'var(--accent-soft)',
                    color: b.kind.includes('CAR') ? 'var(--info)' : b.kind.includes('DLP') ? 'var(--magenta)' : 'var(--accent-2)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}><Icon name="shield" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="num" style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 5px', background: 'var(--surface-3)', borderRadius: 4 }}>{b.code}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{b.kind}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{b.issuer} · {b.cover}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 12.5, fontWeight: 700 }}>{fmtShort(b.amount)}</div>
                    <div style={{ fontSize: 10.5, color: daysToExpiry < 180 ? 'var(--warn)' : 'var(--text-mute)', fontWeight: daysToExpiry < 180 ? 600 : 400 }}>
                      Exp · <span className="num">{daysToExpiry}d</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card rise rise-5">
        <div className="card-head">
          <h3>DLP — defects liability period</h3>
          <span className="sub">Industry-standard 12 months from practical completion · 50% retention released at PC, 50% at DLP expiry</span>
        </div>
        <div className="card-body"><DLPDiagram /></div>
      </div>
    </>
  );
}

function RetentionTimeline({ rows }) {
  const startIdx = (r) => { const [y, mo] = r.halfRelease.split('-').map(Number); return (y - 2026) * 12 + (mo - 1); };
  const endIdx = (r) => { const [y, mo] = r.finalRelease.split('-').map(Number); return (y - 2026) * 12 + (mo - 1); };
  const todayIdx = 4; // May 2026
  const cellW = 100 / 36;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 1200, padding: '14px 16px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ width: 220, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Project</div>
          <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
            {[2026, 2027, 2028].map(yr => (
              <div key={yr} style={{ flex: 1, borderLeft: '1px solid var(--border)', padding: '0 6px' }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{yr}</div>
                <div style={{ display: 'flex', marginTop: 4 }}>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q, qi) => (
                    <div key={q} style={{ flex: 1, fontSize: 9.5, color: 'var(--text-mute)', textAlign: 'left', borderRight: qi < 3 ? '1px solid var(--border)' : 0 }}>{q}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {rows.map(r => {
          const s = startIdx(r), e = endIdx(r);
          return (
            <div key={r.code} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 220, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="num" style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 5px', background: 'var(--surface-3)', borderRadius: 4 }}>{r.code}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.project}</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }} className="num">{fmtShort(r.held)} held</div>
              </div>
              <div style={{ position: 'relative', flex: 1, height: 36 }}>
                <div style={{ position: 'absolute', left: 0, width: `${s * cellW}%`, top: 14, height: 8, borderRadius: 4, background: 'var(--accent)', opacity: .25 }} />
                <div style={{ position: 'absolute', left: `calc(${s * cellW}% - 6px)`, top: 11, width: 14, height: 14, transform: 'rotate(45deg)', background: 'var(--warn)', boxShadow: '0 0 0 2px var(--surface)' }} />
                <div style={{ position: 'absolute', left: `${s * cellW}%`, width: `${(e - s) * cellW}%`, top: 14, height: 8, borderRadius: 4, background: 'var(--good)', opacity: .35 }} />
                <div style={{ position: 'absolute', left: `calc(${e * cellW}% - 6px)`, top: 11, width: 14, height: 14, transform: 'rotate(45deg)', background: 'var(--good)', boxShadow: '0 0 0 2px var(--surface)' }} />
                <div style={{ position: 'absolute', left: `${todayIdx * cellW}%`, top: 0, bottom: 0, width: 1, background: 'var(--accent)', opacity: .6 }} />
                <div style={{ position: 'absolute', left: `calc(${s * cellW}% + 10px)`, top: 28, fontSize: 9.5, color: 'var(--warn)', fontWeight: 600, whiteSpace: 'nowrap' }}>½ {fmtShort(r.held / 2)}</div>
                <div style={{ position: 'absolute', left: `calc(${e * cellW}% + 10px)`, top: 28, fontSize: 9.5, color: 'var(--good)', fontWeight: 600, whiteSpace: 'nowrap' }}>Full</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DLPDiagram() {
  const w = 1080, h = 130;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <rect x="40" y="56" width="360" height="22" rx="4" fill="var(--accent)" opacity=".22" />
      <rect x="400" y="56" width="480" height="22" rx="4" fill="var(--good)" opacity=".22" />
      <rect x="880" y="56" width="160" height="22" rx="4" fill="var(--magenta)" opacity=".22" />
      <path d="M 40 78 L 400 56 L 400 78 Z" fill="var(--accent)" opacity=".4" />
      <path d="M 40 78 L 400 56 L 400 67 L 880 67 L 880 78 L 1040 78" fill="none" stroke="var(--text)" strokeWidth="1.6" />
      <circle cx="400" cy="56" r="4" fill="var(--warn)" stroke="var(--surface)" strokeWidth="2" />
      <circle cx="400" cy="67" r="4" fill="var(--warn)" stroke="var(--surface)" strokeWidth="2" />
      <circle cx="880" cy="67" r="4" fill="var(--good)" stroke="var(--surface)" strokeWidth="2" />
      <circle cx="880" cy="78" r="4" fill="var(--good)" stroke="var(--surface)" strokeWidth="2" />
      <text x="220" y="42" textAnchor="middle" fontSize="11" fontWeight="700">Construction</text>
      <text x="220" y="54" textAnchor="middle" fontSize="9.5" fill="var(--text-dim)">5% retention accruing</text>
      <text x="640" y="42" textAnchor="middle" fontSize="11" fontWeight="700">Defects Liability (12mo)</text>
      <text x="640" y="54" textAnchor="middle" fontSize="9.5" fill="var(--text-dim)">2.5% held · 2.5% released</text>
      <text x="960" y="42" textAnchor="middle" fontSize="11" fontWeight="700">Final Account</text>
      <text x="960" y="54" textAnchor="middle" fontSize="9.5" fill="var(--text-dim)">All retention released</text>
      <line x1="400" y1="78" x2="400" y2="98" stroke="var(--warn)" strokeDasharray="2 2" />
      <text x="400" y="112" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--warn)">Practical Completion</text>
      <text x="400" y="124" textAnchor="middle" fontSize="9" fill="var(--text-dim)">½ retention release</text>
      <line x1="880" y1="78" x2="880" y2="98" stroke="var(--good)" strokeDasharray="2 2" />
      <text x="880" y="112" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--good)">DLP Expiry</text>
      <text x="880" y="124" textAnchor="middle" fontSize="9" fill="var(--text-dim)">Final release</text>
      <line x1="40" y1="78" x2="1040" y2="78" stroke="var(--border-strong)" />
      <g>
        <line x1="240" y1="20" x2="240" y2="98" stroke="var(--text)" strokeWidth="1.2" />
        <rect x="216" y="14" width="48" height="14" rx="3" fill="var(--text)" />
        <text x="240" y="24" textAnchor="middle" fontSize="9.5" fill="var(--surface)" fontWeight="700">TODAY</text>
      </g>
    </svg>
  );
}
