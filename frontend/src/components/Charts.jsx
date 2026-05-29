// Charts — sparklines, bars, donuts, area, S-curves (from ConstructOS design)

import { useId } from 'react';

export function Sparkline({ data, color = 'var(--accent)', width = 80, height = 28, fill = true }) {
  const id = useId();
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / range) * (height - 4)]);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const fillD = d + ` L${width},${height} L0,${height} Z`;
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

export function MiniBars({ data, color = 'var(--accent)', width = 80, height = 28 }) {
  const max = Math.max(...data) || 1;
  const w = (width - (data.length - 1) * 2) / data.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 2));
        return (
          <rect key={i} x={i * (w + 2)} y={height - h} width={w} height={h} rx="1"
            fill={color} opacity={0.6 + 0.4 * (i / data.length)} />
        );
      })}
    </svg>
  );
}

export function CashflowChart({ height = 220 }) {
  const months = ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12','W13'];
  const certified = [2.1, 3.4, 2.8, 4.2, 3.9, 5.1, 4.8, 6.2, 5.4, 7.1, 6.4, 8.2, 7.8];
  const invoiced  = [1.8, 2.9, 2.3, 3.6, 3.4, 4.5, 4.1, 5.3, 4.7, 6.2, 5.4, 7.1, 6.6];
  const received  = [1.2, 1.9, 2.6, 2.0, 3.1, 2.7, 4.0, 3.7, 4.6, 4.0, 5.4, 4.8, 6.2];

  const w = 800, h = height, p = { l: 44, r: 12, t: 14, b: 28 };
  const max = 9;
  const xAt = (i) => p.l + (i / (months.length - 1)) * (w - p.l - p.r);
  const yAt = (v) => p.t + (1 - v / max) * (h - p.t - p.b);

  const buildArea = (arr) => {
    let d = `M ${xAt(0)} ${yAt(0)}`;
    arr.forEach((v, i) => { d += ` L ${xAt(i)} ${yAt(v)}`; });
    d += ` L ${xAt(arr.length - 1)} ${yAt(0)} Z`;
    return d;
  };
  const buildLine = (arr) =>
    arr.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ' ' + yAt(v)).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cfA" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cfB" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--info)" stopOpacity=".18" />
          <stop offset="100%" stopColor="var(--info)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cfC" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--good)" stopOpacity=".20" />
          <stop offset="100%" stopColor="var(--good)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 2, 4, 6, 8].map((v) => (
        <g key={v}>
          <line x1={p.l} x2={w - p.r} y1={yAt(v)} y2={yAt(v)}
            stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 ? '' : '2 4'} />
          <text x={p.l - 8} y={yAt(v) + 3} fontSize="10" fill="var(--text-mute)"
            textAnchor="end" fontFamily="JetBrains Mono, monospace">RM{v}M</text>
        </g>
      ))}
      <path d={buildArea(certified)} fill="url(#cfA)" />
      <path d={buildArea(invoiced)} fill="url(#cfB)" />
      <path d={buildArea(received)} fill="url(#cfC)" />
      <path d={buildLine(certified)} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path d={buildLine(invoiced)} fill="none" stroke="var(--info)" strokeWidth="2" strokeDasharray="4 3" />
      <path d={buildLine(received)} fill="none" stroke="var(--good)" strokeWidth="2" />
      {months.map((m, i) => i % 2 === 0 && (
        <text key={m} x={xAt(i)} y={h - 8} fontSize="10" fill="var(--text-mute)" textAnchor="middle">{m}</text>
      ))}
      <line x1={xAt(6)} x2={xAt(6)} y1={p.t} y2={h - p.b}
        stroke="var(--text-2)" strokeWidth="1" strokeDasharray="3 3" opacity=".4" />
      <circle cx={xAt(6)} cy={yAt(certified[6])} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

export function SCurve({ actual, width = 120, height = 36 }) {
  const planArr = Array.from({ length: 24 }, (_, i) => {
    const x = i / 23;
    return 1 / (1 + Math.exp(-8 * (x - 0.5)));
  });
  const actualLen = Math.max(2, Math.round(planArr.length * actual));
  const lineD = (arr) => arr.map((v, i) => {
    const x = (i / (planArr.length - 1)) * width;
    const y = height - 2 - v * (height - 4);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={lineD(planArr)} fill="none" stroke="var(--text-mute)" strokeWidth="1"
        strokeDasharray="2 2" opacity=".7" />
      <path d={lineD(planArr.slice(0, actualLen))} fill="none" stroke="var(--accent)"
        strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Donut({ segments, size = 140, thickness = 18, label, sublabel }) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--bg-2)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const offset = -acc;
          acc += len;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness}
              strokeDasharray={dash} strokeDashoffset={offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray .8s cubic-bezier(.22,.8,.25,1)' }} />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', lineHeight: 1.1
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sublabel}</div>
      </div>
    </div>
  );
}

export function BarList({ items, max, color = 'var(--accent)' }) {
  const m = max || Math.max(...items.map(i => i.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 90, fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{it.label}</div>
          <div style={{ flex: 1, height: 8, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(it.value / m) * 100}%`, height: '100%',
              background: it.color || color, borderRadius: 999,
              transition: 'width .8s cubic-bezier(.22,.8,.25,1)'
            }} />
          </div>
          <div style={{ width: 80, textAlign: 'right', fontSize: 12, fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
            {it.display || it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StackBar({ items, height = 28, total }) {
  const sum = total || items.reduce((a, b) => a + b.amount, 0);
  return (
    <div style={{ display: 'flex', height, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {items.map((it, i) => (
        <div key={i} title={`${it.bucket}: ${it.amount}`}
          style={{
            flexBasis: `${(it.amount / sum) * 100}%`,
            background: it.color,
            borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,.4)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 600,
            transition: 'flex-basis .8s cubic-bezier(.22,.8,.25,1)'
          }}>
          {(it.amount / sum) > 0.08 ? `${Math.round((it.amount / sum) * 100)}%` : ''}
        </div>
      ))}
    </div>
  );
}
