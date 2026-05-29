import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

const features = [
  { icon: 'building',   title: 'Project Management',    desc: 'Track milestones, tasks and team assignments across all your projects in one place.' },
  { icon: 'money',      title: 'Finance & Claims',       desc: 'Manage progress claims, payment certificates and retention with automated reminders.' },
  { icon: 'hash',       title: 'Tender / BQ',            desc: 'Build Bills of Quantities with templates, version history and AI auto-fill.' },
  { icon: 'users',      title: 'HR & Payroll',           desc: 'Clock in/out, leave management, payroll calculation and staff letters — all inside ContractOS.' },
  { icon: 'inventory',  title: 'Inventory',              desc: 'Track stock, manage borrowed assets and auto-generate purchase orders when stock runs low.' },
  { icon: 'doc',        title: 'Document Manager',       desc: 'Drag and drop documents, sign digitally and keep full version history — forever.' },
  { icon: 'shield',     title: 'Safety (DOSH/OSHA)',     desc: 'Incident reporting, inspections, certification tracking and compliance alerts.' },
  { icon: 'truck',      title: 'Fleet Management',       desc: 'Track vehicles, maintenance schedules, fuel usage and operating costs per site.' },
];

const tiers = [
  {
    name: 'Free', price: 'RM 0', period: '/month', users: '3 users',
    cta: 'Get Started Free', highlight: false,
    features: ['Basic dashboard', 'Up to 3 projects', 'Basic HR', 'Basic documents', 'Help centre'],
  },
  {
    name: 'Pro', price: 'RM 199', period: '/month', users: '15 users',
    cta: 'Start 5-Day Trial', highlight: false,
    features: ['Everything in Free', 'Unlimited projects', 'Full finance & invoicing', 'Full HR & payroll', 'Market rates', 'Email support'],
  },
  {
    name: 'Business', price: 'RM 499', period: '/month', users: '50 users',
    cta: 'Start 5-Day Trial', highlight: true,
    features: ['Everything in Pro', 'AI BQ auto-fill', 'API access', 'Accounting integrations', 'All report formats', 'Live chat support'],
  },
  {
    name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited users',
    cta: 'Contact Sales', highlight: false,
    features: ['Everything in Business', 'Multi-subsidiary', 'Custom email domain', 'Dedicated support', 'Custom onboarding', 'SLA guarantee'],
  },
];

const faqs = [
  { q: 'Is my data stored in Malaysia?', a: 'Yes. ContractOS stores all primary data on AWS servers in Kuala Lumpur, fully compliant with PDPA 2010.' },
  { q: 'Can I use this on my phone?', a: 'Yes. ContractOS is a Progressive Web App (PWA) — install it on Android or iOS and use it on-site.' },
  { q: 'Does it support Bahasa Malaysia?', a: 'The landing page is bilingual (EN/BM). The app interface is in English, with BM support coming in a future update.' },
  { q: 'What payment methods do you accept?', a: 'We accept FPX (Malaysian online banking) and all major credit/debit cards via Stripe.' },
  { q: 'Can subcontractors access the system?', a: 'Yes. Subcontractors get their own limited login — they can only see their assigned scope and submit progress.' },
  { q: 'Is there a contract? Can I cancel anytime?', a: 'No contracts. Monthly plans can be cancelled anytime. Yearly plans receive a pro-rated refund for unused months.' },
];

/* ── Inline styles using design tokens ───────────────────────────────────── */
const s = {
  // layout
  page:       { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Geist, sans-serif' },
  container:  { maxWidth: '1200px', margin: '0 auto', padding: '0 32px' },

  // nav
  nav:        { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' },
  navInner:   { maxWidth: '1200px', margin: '0 auto', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },

  // hero
  hero:       { padding: '80px 32px 72px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' },
  badge:      { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '99px', marginBottom: '24px' },
  h1:         { fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, color: 'var(--text)', letterSpacing: '-1px', marginBottom: '20px' },
  heroSub:    { fontSize: '18px', color: 'var(--text-dim)', maxWidth: '600px', margin: '0 auto 36px', lineHeight: 1.6 },
  heroCta:    { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
  heroNote:   { marginTop: '16px', fontSize: '12px', color: 'var(--text-mute)' },

  // sections
  section:    { padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' },
  sectionHead:{ textAlign: 'center', marginBottom: '48px' },
  sectionH2:  { fontSize: '32px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '10px' },
  sectionSub: { fontSize: '16px', color: 'var(--text-dim)', maxWidth: '520px', margin: '0 auto' },

  // feature grid
  grid4:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' },
  featCard:   { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'default' },
  featIcon:   { width: '40px', height: '40px', background: 'var(--accent-soft)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: 'var(--accent)' },
  featTitle:  { fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' },
  featDesc:   { fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6 },

  // pricing
  grid4p:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' },
  tierCard:   { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' },
  tierHL:     { border: '2px solid var(--accent)', boxShadow: '0 0 0 4px var(--accent-soft)' },
  tierBadge:  { display: 'inline-flex', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', alignSelf: 'flex-start', marginBottom: '12px' },
  tierName:   { fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' },
  tierPrice:  { fontSize: '32px', fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-1px' },
  tierPeriod: { fontSize: '13px', color: 'var(--text-mute)', marginLeft: '2px' },
  tierUsers:  { fontSize: '12px', color: 'var(--text-mute)', marginTop: '4px', marginBottom: '16px' },
  tierFeature:{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-2)', marginBottom: '8px' },
  tierCheck:  { color: 'var(--good)', flexShrink: 0, marginTop: '1px' },

  // faq
  faqCard:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px 24px', marginBottom: '12px' },
  faqQ:       { fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' },
  faqA:       { fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.7 },

  // contact
  contactCard:{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '14px' },

  // footer
  footer:     { borderTop: '1px solid var(--border)', background: 'var(--surface)', marginTop: '40px' },
  footerIn:   { maxWidth: '1200px', margin: '0 auto', padding: '28px 32px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
};

export default function LandingPage() {
  return (
    <div style={s.page}>

      {/* ── NAV ──────────────────────────────────────── */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          {/* Brand */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div className="brand-mark" style={{ width: '30px', height: '30px', fontSize: '15px', borderRadius: '8px' }}>C</div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>ContractOS</span>
          </Link>

          {/* Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              {['features', 'pricing', 'faq', 'contact'].map(id => (
                <a key={id} href={`#${id}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-dim)', textDecoration: 'none', textTransform: 'capitalize', transition: 'color 0.12s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/login" className="btn ghost sm">Sign In</Link>
              <Link to="/signup" className="btn primary sm">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={s.hero}>
        <div style={s.badge}>
          🇲🇾 Built for Malaysian Construction Companies
        </div>

        <h1 style={s.h1}>
          One Platform for Your<br />
          <span style={{ color: 'var(--accent)' }}>Entire Construction Business</span>
        </h1>

        <p style={s.heroSub}>
          ContractOS replaces spreadsheets, WhatsApp groups and disconnected tools with a single enterprise-grade system — built specifically for Malaysian contractors.
        </p>

        <div style={s.heroCta}>
          <Link to="/signup" className="btn primary" style={{ padding: '10px 28px', fontSize: '15px' }}>
            Start Free — No Credit Card
          </Link>
          <a href="#features" className="btn ghost" style={{ padding: '10px 28px', fontSize: '15px' }}>
            See All Features
          </a>
        </div>

        <p style={s.heroNote}>
          5-day free trial on all paid features · PDPA 2010 compliant · Hosted in Malaysia
        </p>

        {/* Stats strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '56px', flexWrap: 'wrap' }}>
          {[
            { val: '16',    label: 'Modules' },
            { val: '100%',  label: 'Malaysian built' },
            { val: 'RM 0',  label: 'To start' },
            { val: 'PDPA',  label: '2010 compliant' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.5px' }}>{stat.val}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-mute)', marginTop: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section id="features" style={{ ...s.section, background: 'var(--surface-2)', maxWidth: 'none', padding: '80px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
          <div style={s.sectionHead}>
            <h2 style={s.sectionH2}>Everything Your Team Needs</h2>
            <p style={s.sectionSub}>16 modules covering every part of your construction business — from tender to final claim.</p>
          </div>
          <div style={s.grid4}>
            {features.map(f => (
              <div key={f.title} style={s.featCard}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(31,79,216,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={s.featIcon}>
                  <Icon name={f.icon} size={20} />
                </div>
                <div style={s.featTitle}>{f.title}</div>
                <div style={s.featDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────── */}
      <section id="pricing" style={s.section}>
        <div style={s.sectionHead}>
          <h2 style={s.sectionH2}>Simple, Transparent Pricing</h2>
          <p style={s.sectionSub}>Start free. Upgrade as you grow. No hidden fees.</p>
        </div>
        <div style={s.grid4p}>
          {tiers.map(tier => (
            <div key={tier.name} style={{ ...s.tierCard, ...(tier.highlight ? s.tierHL : {}) }}>
              {tier.highlight && (
                <span style={s.tierBadge}>Most Popular</span>
              )}
              <div style={s.tierName}>{tier.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                <span style={s.tierPrice}>{tier.price}</span>
                <span style={s.tierPeriod}>{tier.period}</span>
              </div>
              <div style={s.tierUsers}>{tier.users}</div>
              <div style={{ flex: 1, marginBottom: '20px' }}>
                {tier.features.map(f => (
                  <div key={f} style={s.tierFeature}>
                    <Icon name="check" size={13} style={s.tierCheck} />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                to={tier.cta === 'Contact Sales' ? '#contact' : '/signup'}
                className={tier.highlight ? 'btn primary' : 'btn ghost'}
                style={{ textAlign: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section id="faq" style={{ ...s.section, maxWidth: '760px' }}>
        <div style={s.sectionHead}>
          <h2 style={s.sectionH2}>Frequently Asked Questions</h2>
        </div>
        {faqs.map(item => (
          <div key={item.q} style={s.faqCard}>
            <div style={s.faqQ}>{item.q}</div>
            <div style={s.faqA}>{item.a}</div>
          </div>
        ))}
      </section>

      {/* ── CONTACT ──────────────────────────────────── */}
      <section id="contact" style={{ ...s.section, maxWidth: '560px' }}>
        <div style={s.sectionHead}>
          <h2 style={s.sectionH2}>Get In Touch</h2>
          <p style={s.sectionSub}>Have questions? We'd love to hear from you.</p>
        </div>
        <div style={s.contactCard}>
          <div className="form-group">
            <label className="label">Your Name</label>
            <input type="text" className="input" placeholder="Ahmad Razif" />
          </div>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="you@company.com.my" />
          </div>
          <div className="form-group">
            <label className="label">Company Name</label>
            <input type="text" className="input" placeholder="Demo Construction Sdn Bhd" />
          </div>
          <div className="form-group">
            <label className="label">Message</label>
            <textarea rows={4} className="input" style={{ resize: 'vertical' }} placeholder="How can we help?" />
          </div>
          <button className="btn primary" style={{ justifyContent: 'center' }}>
            <Icon name="send" size={14} /> Send Message
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerIn}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-mark" style={{ width: '24px', height: '24px', fontSize: '12px', borderRadius: '6px' }}>C</div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>ContractOS</span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Privacy Policy', to: '/privacy' },
              { label: 'Terms of Service', to: '/terms' },
            ].map(l => (
              <Link key={l.label} to={l.to} style={{ fontSize: '13px', color: 'var(--text-dim)', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = 'var(--text)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>
                {l.label}
              </Link>
            ))}
            <a href="mailto:hello@contractos.my" style={{ fontSize: '13px', color: 'var(--text-dim)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--text)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>
              hello@contractos.my
            </a>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-mute)' }}>© 2026 ContractOS Sdn Bhd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
