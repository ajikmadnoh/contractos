// Finance · Payment Certificates tab — pipeline, list + document view, audit
// trail. Ported from the ConstructOS design; consumes live certs when present.
import React from 'react';
import Icon from '../../components/Icon';
import { BrandMark, fmtShort, fmtNum } from './finCharts';
import { PAYMENT_CERTS } from './finData';

export default function FinancePaymentCerts({ certs }) {
  const list = certs && certs.length ? certs : PAYMENT_CERTS;
  const [selected, setSelected] = React.useState(list[0]?.id);
  const cert = list.find(c => c.id === selected) || list[0];

  return (
    <>
      <div className="card rise rise-1">
        <div className="card-head"><h3>PC pipeline — Apr 2026</h3><span className="sub">Click a stage to filter</span></div>
        <div className="card-body"><PCPipeline list={list} /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--gap)' }}>
        <div className="card rise rise-2" style={{ gridColumn: 'span 5' }}>
          <div className="card-head"><h3>All payment certificates</h3><span className="sub">{list.length} this period</span></div>
          <div style={{ maxHeight: 720, overflowY: 'auto' }}>
            {list.map(c => <PCRow key={c.id} cert={c} active={c.id === selected} onClick={() => setSelected(c.id)} />)}
          </div>
        </div>
        <div className="card rise rise-3" style={{ gridColumn: 'span 7' }}>
          {cert && <PaymentCertificate cert={cert} />}
        </div>
      </div>
    </>
  );
}

function PCPipeline({ list }) {
  const stages = [
    { id: 'draft',     label: 'Draft',     tone: 'outline', icon: 'doc' },
    { id: 'submitted', label: 'Submitted', tone: 'info',    icon: 'send' },
    { id: 'review',    label: 'CA review', tone: 'warn',    icon: 'sparkles' },
    { id: 'approved',  label: 'Certified', tone: 'accent',  icon: 'check' },
    { id: 'paid',      label: 'Paid',      tone: 'good',    icon: 'money' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {stages.map((s, i) => {
        const items = list.filter(c => c.status === s.id);
        const total = items.reduce((sum, c) => sum + c.net, 0);
        return (
          <div key={s.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, position: 'relative' }}>
            {i < stages.length - 1 && (
              <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: 'var(--text-mute)' }}>
                <Icon name="chevR" size={16} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: s.tone === 'outline' ? 'var(--surface)' : `var(--${s.tone === 'accent' ? 'accent' : s.tone}-soft)`,
                color: s.tone === 'outline' ? 'var(--text-dim)' : `var(--${s.tone === 'accent' ? 'accent-2' : s.tone})`,
                border: s.tone === 'outline' ? '1px solid var(--border)' : '0',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name={s.icon} size={11} /></div>
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-dim)' }}>{s.label}</div>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)' }}>{items.length}</span>
            </div>
            <div className="num" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>{fmtShort(total)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 4 }}>
              {items.length > 0 ? items.slice(0, 2).map(c => c.code).join(' · ') : 'No items'}
              {items.length > 2 && ` +${items.length - 2}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PCRow({ cert, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '12px 16px', borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
      borderBottom: '1px solid var(--border)', background: active ? 'var(--accent-soft)' : 'transparent',
      cursor: 'pointer', transition: 'background .12s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="num" style={{ fontWeight: 700, fontSize: 12 }}>{cert.id}</span>
        {cert.status === 'review'    && <span className="pill warn"><Icon name="sparkles" size={10} /> AI review</span>}
        {cert.status === 'approved'  && <span className="pill accent">Certified</span>}
        {cert.status === 'paid'      && <span className="pill good"><Icon name="check" size={10} /> Paid</span>}
        {cert.status === 'draft'     && <span className="pill outline">Draft</span>}
        {cert.status === 'submitted' && <span className="pill info">Submitted</span>}
        {cert.status === 'overdue'   && <span className="pill danger">Overdue</span>}
        <div style={{ marginLeft: 'auto' }} className="num"><b style={{ fontSize: 13 }}>{fmtShort(cert.net)}</b></div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        <span className="num" style={{ fontWeight: 700, color: 'var(--text)' }}>{cert.code}</span> · {cert.period}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10.5, color: 'var(--text-mute)' }}>
        <span>{cert.client}</span>
        <span style={{ marginLeft: 'auto', color: cert.status === 'overdue' ? 'var(--danger)' : 'var(--text-dim)', fontWeight: cert.status === 'overdue' ? 600 : 400 }}>{cert.dueText}</span>
      </div>
    </div>
  );
}

function PaymentCertificate({ cert }) {
  return (
    <>
      <div className="card-head">
        <h3>{cert.id}</h3>
        <span className="sub">{cert.project} · Period {String(cert.period).split('·')[0].trim().replace('#', '')}</span>
        <div className="spacer" />
        <button className="btn sm ghost"><Icon name="copy" size={12} /> Duplicate</button>
        <button className="btn sm"><Icon name="download" size={12} /> PDF</button>
        <button className="btn sm primary"><Icon name="send" size={12} /> MyInvois</button>
      </div>
      <div style={{ padding: 20, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 22, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, lineHeight: 1.6, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, background: 'var(--text)', color: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}><BrandMark /></div>
                <div style={{ fontWeight: 700, letterSpacing: '-0.01em', fontSize: 13 }}>Permata Bina Group Sdn Bhd</div>
              </div>
              <div style={{ marginTop: 5, color: 'var(--text-dim)', fontSize: 10.5 }}>
                Suite 14-2, Menara Hap Seng 2 · 50250 Kuala Lumpur<br />
                SSM 201801012345 · CIDB G7-PB-1500-95
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, letterSpacing: '.02em', fontSize: 12, textTransform: 'uppercase' }}>Payment Certificate</div>
              <div style={{ marginTop: 4, fontSize: 10.5 }}>No. <b>{cert.id}</b></div>
              <div style={{ fontSize: 10.5 }}>Period <b>{cert.period}</b></div>
              <div style={{ fontSize: 10.5 }}>Due <b>{cert.dueText}</b></div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 12 }}>
            <div>
              <div style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 9, letterSpacing: '.06em' }}>Employer</div>
              <div style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>{cert.client}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 9, letterSpacing: '.06em' }}>Project</div>
              <div style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>{cert.project}</div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
            <tbody>
              {[
                ['Gross value this period', cert.gross, true],
                ['Less retention 5%', -cert.ret],
                cert.prevAdj !== 0 ? ['Less previous claim adjustment', cert.prevAdj] : null,
                cert.reimb > 0 ? ['Add reimbursable', cert.reimb] : null,
                ['Net payable this PC', cert.net, true, true],
              ].filter(Boolean).map(([label, val, bold, hi], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0', fontWeight: bold ? 700 : 400, background: hi ? 'var(--surface-2)' : 'transparent', paddingLeft: hi ? 6 : 0 }}>{label}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: bold ? 700 : 400, background: hi ? 'var(--surface-2)' : 'transparent', paddingRight: hi ? 6 : 0 }}>
                    {val < 0 ? '(' + fmtNum(Math.abs(val)) + ')' : fmtNum(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 14, fontSize: 10 }}>
            <div>
              <div style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 9, letterSpacing: '.06em' }}>Certified by</div>
              <div style={{ height: 28, marginTop: 4, borderBottom: '1px dashed var(--border-strong)' }} />
              <div style={{ marginTop: 4, fontWeight: 600 }}>Ir. Aminah Razak</div>
              <div style={{ color: 'var(--text-dim)' }}>Project Director · BEM 75428</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 9, letterSpacing: '.06em' }}>Concurred by C.A.</div>
              <div style={{ height: 28, marginTop: 4, borderBottom: '1px dashed var(--border-strong)' }} />
              <div style={{ marginTop: 4, fontWeight: 600 }}>Datin Sr. Lim Mei Ling</div>
              <div style={{ color: 'var(--text-dim)' }}>Contract Administrator · BQSM 4187</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Audit trail</div>
        <PCAuditTrail />
      </div>
    </>
  );
}

function PCAuditTrail() {
  const events = [
    { time: '11 May · 09:14', who: 'Tan WM (QS)',   act: 'Created from BQ template', tone: 'info' },
    { time: '11 May · 14:32', who: 'AI Copilot',    act: 'Flagged 6 line items — review needed', tone: 'warn' },
    { time: '12 May · 08:40', who: 'Aminah R (PD)', act: 'Adjusted T20 reinforcement (-25t)', tone: 'good' },
    { time: '12 May · 10:21', who: 'Lim ML (CA)',   act: 'Concurred — signed digitally', tone: 'good' },
    { time: '12 May · 10:22', who: 'System',        act: 'Submitted to MyInvois (LHDN)', tone: 'info' },
    { time: '12 May · 10:24', who: 'LHDN MyInvois', act: 'UUID validated · IRN PB-2026-04129', tone: 'good' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: `var(--${e.tone})`, flexShrink: 0 }} />
          <span className="num" style={{ color: 'var(--text-mute)', fontSize: 10.5, width: 110 }}>{e.time}</span>
          <span style={{ fontWeight: 600, width: 130 }}>{e.who}</span>
          <span style={{ color: 'var(--text-dim)' }}>{e.act}</span>
        </div>
      ))}
    </div>
  );
}
