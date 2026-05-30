// Shared finance chart primitives + format helpers.
// Hand-rolled SVG (ported from the ConstructOS design) so they animate cleanly
// with our CSS tokens and match the mock pixel-for-pixel.
import React from 'react';
import Icon from '../../components/Icon';

/* ── Format helpers (Malaysian construction context) ── */
export const fmtRM   = (n) => 'RM ' + new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 }).format(Number(n || 0));
export const fmtRMc  = (n) => 'RM ' + new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
export const fmtNum  = (n) => new Intl.NumberFormat('en-MY').format(Number(n || 0));
export const fmtShort = (n) => {
  n = Number(n || 0);
  if (n >= 1e9) return 'RM ' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return 'RM ' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return 'RM ' + (n / 1e3).toFixed(1) + 'k';
  return 'RM ' + n;
};
export const fmtDateShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }) : '—';
export const fmtDateLong = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

/* ── Brand mark used on the certificate document ── */
export function BrandMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
    </svg>
  );
}

/* ── Sparkline ── */
export function Sparkline({ data, color = 'var(--accent)', width = 80, height = 28, fill = true }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / range) * (height - 4)]);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const fillD = d + ` L${width},${height} L0,${height} Z`;
  const id = React.useId();
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

/* ── Donut ── */
export function Donut({ segments, size = 140, thickness = 18, label, sublabel }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const offset = -acc;
          acc += len;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness} strokeDasharray={dash} strokeDashoffset={offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray .8s cubic-bezier(.22,.8,.25,1)' }} />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.1 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sublabel}</div>
      </div>
    </div>
  );
}

export function DonutLegend({ color, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
      <span style={{ flex: 1, color: 'var(--text-dim)' }}>{label}</span>
      <span className="num" style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

/* ── Legend strip ── */
export function Legend({ items }) {
  return (
    <div style={{ display: 'inline-flex', gap: 12, fontSize: 11, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ── KPI tile ── */
export function KpiTile({ label, value, foot, delta, tone, spark }) {
  const down = tone === 'warn' || tone === 'danger';
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        <span className={`delta ${down ? 'down' : 'up'}`}>
          <Icon name="arrowU" size={10} />
          {delta}
        </span>
        <span style={{ color: 'var(--text-mute)' }}>{foot}</span>
      </div>
      <div className="kpi-spark">{spark}</div>
    </div>
  );
}
