// Finance — top-level screen with 5 tabs (Cockpit, Receivables, Payment Certs,
// Retention & Bonds, MyInvois). UI ported from the ConstructOS design; live data
// from the finance API overrides the design's representative figures where present.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NewPCModal from './NewPCModal';
import api from '../../lib/api';
import Icon from '../../components/Icon';
import { fmtShort } from './finCharts';
import FinanceCockpit from './tabCockpit';
import FinanceReceivables from './tabReceivables';
import FinancePaymentCerts from './tabCerts';
import FinanceRetention from './tabRetention';
import FinanceMyInvois from './tabMyInvois';
import './finance.css';

const TABS = [
  { id: 'cockpit', label: 'Cockpit',          icon: 'dashboard' },
  { id: 'ar',      label: 'Receivables',       icon: 'money',    badgeKey: 'receivables' },
  { id: 'certs',   label: 'Payment Certs',     icon: 'doc',      badgeKey: 'certCount' },
  { id: 'retent',  label: 'Retention & Bonds', icon: 'shield' },
  { id: 'einv',    label: 'MyInvois',          icon: 'sparkles', badge: 'LHDN' },
];

// Map a live payment_certificate row into the design's certificate shape.
function mapCert(c) {
  const statusMap = { pending: 'submitted', certified: 'approved', paid: 'paid', overdue: 'overdue', partially_paid: 'approved', draft: 'draft', submitted: 'submitted' };
  const net = Number(c.certified_amount || 0);
  const ret = Number(c.claim_retention || 0);
  const gross = c.claim_amount != null ? Number(c.claim_amount) : net;
  const code = (c.project_name || '').split(/[\s—-]/)[0].slice(0, 7).toUpperCase() || 'PROJ';
  let dueText = '—';
  if (c.status === 'paid') dueText = 'Paid';
  else if (c.due_date) {
    const days = Math.round((new Date(c.due_date) - Date.now()) / 86400000);
    dueText = days < 0 ? `Overdue ${Math.abs(days)}d` : days === 0 ? 'Due today' : `Due in ${days}d`;
  }
  return {
    id: c.cert_number || c.id, code,
    period: c.cert_date ? new Date(c.cert_date).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }) : 'Current',
    status: statusMap[c.status] || 'submitted',
    gross, ret, prevAdj: 0, reimb: 0, net,
    dueText, client: c.client_name || c.project_name || '—', project: c.project_name || '—',
  };
}

export default function FinancePage() {
  const [tab, setTab] = useState('cockpit');
  const [showNewPC, setShowNewPC] = useState(false);
  const qc = useQueryClient();

  const { data: cockpit } = useQuery({ queryKey: ['fin-cockpit'], queryFn: () => api.get('/finance/cockpit').then(r => r.data).catch(() => null) });
  const { data: aging } = useQuery({ queryKey: ['fin-aging'], queryFn: () => api.get('/finance/aging-matrix').then(r => r.data).catch(() => null) });
  const { data: dunning = [] } = useQuery({ queryKey: ['fin-dunning'], queryFn: () => api.get('/finance/dunning').then(r => r.data).catch(() => []) });
  const { data: liveCerts = [] } = useQuery({ queryKey: ['payment-certs'], queryFn: () => api.get('/finance/payment-certs').then(r => r.data).catch(() => []) });
  const { data: bonds = [] } = useQuery({ queryKey: ['fin-bonds'], queryFn: () => api.get('/finance/bonds').then(r => r.data).catch(() => []) });
  const { data: statutory = [] } = useQuery({ queryKey: ['fin-statutory'], queryFn: () => api.get('/finance/statutory').then(r => r.data).catch(() => []) });
  const { data: retention = [] } = useQuery({ queryKey: ['fin-retention'], queryFn: () => api.get('/finance/retention').then(r => r.data).catch(() => []) });

  const certs = (liveCerts || []).map(mapCert);

  const sendAllReminders = async () => {
    try {
      const r = await api.post('/finance/dunning/send-all').then(x => x.data);
      window.alert(`Reminders sent — ${r?.escalated ?? 0} overdue invoice(s) escalated.`);
    } catch {
      window.alert('Could not send reminders. Please try again.');
    } finally {
      qc.invalidateQueries({ queryKey: ['fin-dunning'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  // Derive real KPIs from live invoice data when cockpit endpoint returns null
  const { data: allInvoices = [] } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: () => api.get('/invoices').then(r => r.data || []),
    staleTime: 3 * 60_000,
  });
  const totalReceivables = allInvoices
    .filter(i => ['unpaid', 'overdue', 'partially_paid', 'sent'].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const overdueInvoices = allInvoices.filter(i => i.status === 'overdue').length;
  const sentInvoices = allInvoices.filter(i => i.status === 'sent').length;

  // Current accounting period
  const now = new Date();
  const periodLabel = now.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const closesLabel = `${lastDay} ${now.toLocaleDateString('en-MY', { month: 'short' })}`;

  return (
    <div className="fin">
      <div className="page-head">
        <div>
          <h1>Finance</h1>
          <div className="sub">Cashflow · receivables · payment certificates · retention &amp; bonds · LHDN MyInvois</div>
        </div>
        <div className="actions">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', border: '1px solid var(--border)', borderRadius: 999, background: 'var(--surface-2)', fontSize: 11.5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)', boxShadow: '0 0 0 3px var(--good-soft)' }} />
            <span style={{ color: 'var(--text-dim)' }}>Period</span>
            <span style={{ fontWeight: 600 }}>{periodLabel}</span>
            <span style={{ color: 'var(--text-mute)' }}>·</span>
            <span style={{ color: 'var(--text-dim)' }}>Closes</span>
            <span style={{ fontWeight: 600 }}>{closesLabel}</span>
          </div>
          {overdueInvoices > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="alert" size={12} /> {overdueInvoices} overdue invoice{overdueInvoices !== 1 ? 's' : ''}
              </span>
            </span>
          )}
          <button className="btn ghost"><Icon name="filter" size={14} /> Filter</button>
          <button className="btn"><Icon name="download" size={14} /> Export</button>
          <button className="btn primary" onClick={() => setShowNewPC(true)}><Icon name="plus" size={14} /> New PC</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(x => {
          let badge = x.badge;
          if (x.badgeKey === 'receivables') badge = cockpit?.kpis?.receivables || (totalReceivables > 0 ? fmtShort(totalReceivables) : undefined);
          if (x.badgeKey === 'certCount') badge = String(certs.length || 8);
          return (
            <button key={x.id} aria-current={tab === x.id ? 'page' : undefined} onClick={() => setTab(x.id)}>
              <Icon name={x.icon} size={13} />
              {x.label}
              {badge && <span className="badge">{badge}</span>}
            </button>
          );
        })}
      </div>

      {showNewPC && <NewPCModal onClose={() => setShowNewPC(false)} />}

      <div className="page-body" style={{ paddingTop: 12 }}>
        {tab === 'cockpit' && <FinanceCockpit
          live={{
            ...(cockpit || {}),
            kpis: {
              ...(cockpit?.kpis || {}),
              receivables: cockpit?.kpis?.receivables || (totalReceivables > 0 ? fmtShort(totalReceivables) : undefined),
              receivablesFoot: cockpit?.kpis?.receivablesFoot || (allInvoices.length > 0 ? `${sentInvoices + overdueInvoices} open invoices` : undefined),
            },
          }}
          statutory={statutory}
          matrix={aging}
        />}
        {tab === 'ar'      && <FinanceReceivables matrix={aging} dunning={dunning} onSendAll={sendAllReminders} />}
        {tab === 'certs'   && <FinancePaymentCerts certs={certs} />}
        {tab === 'retent'  && <FinanceRetention ledger={retention} bonds={bonds} />}
        {tab === 'einv'    && <FinanceMyInvois />}
      </div>
    </div>
  );
}
