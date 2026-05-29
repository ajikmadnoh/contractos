import { Link } from 'react-router-dom';

const features = [
  { icon: '📁', title: 'Project Management', desc: 'Track milestones, tasks and team assignments across all your projects in one place.' },
  { icon: '💰', title: 'Finance & Claims', desc: 'Manage progress claims, payment certificates and retention with automated reminders.' },
  { icon: '📋', title: 'Tender / BQ', desc: 'Build Bills of Quantities with templates, version history and AI auto-fill.' },
  { icon: '👥', title: 'HR & Payroll', desc: 'Clock in/out, leave management, payroll calculation and staff letters — all inside ContractOS.' },
  { icon: '📦', title: 'Inventory', desc: 'Track stock, manage borrowed assets and auto-generate purchase orders when stock runs low.' },
  { icon: '📄', title: 'Document Manager', desc: 'Drag and drop documents, sign digitally and keep full version history — forever.' },
  { icon: '🛡️', title: 'Safety (DOSH/OSHA)', desc: 'Incident reporting, safety inspections, certification tracking and compliance alerts.' },
  { icon: '🚛', title: 'Fleet Management', desc: 'Track vehicles, maintenance schedules, fuel usage and operating costs per site.' },
];

const tiers = [
  { name: 'Free', price: 'RM 0', period: '/month', users: '3 users', cta: 'Get Started Free', highlight: false, features: ['Basic dashboard', 'Up to 3 projects', 'Basic HR', 'Basic documents', 'Help centre'] },
  { name: 'Pro', price: 'RM 199', period: '/month', users: '15 users', cta: 'Start 5-Day Trial', highlight: false, features: ['Everything in Free', 'Unlimited projects', 'Full finance & invoicing', 'Full HR & payroll', 'Market rates', 'Email support'] },
  { name: 'Business', price: 'RM 499', period: '/month', users: '50 users', cta: 'Start 5-Day Trial', highlight: true, features: ['Everything in Pro', 'AI BQ auto-fill', 'API access', 'Accounting integrations', 'All report formats', 'Live chat support'] },
  { name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited users', cta: 'Contact Sales', highlight: false, features: ['Everything in Business', 'Multi-subsidiary', 'Custom email domain', 'Dedicated support', 'Custom onboarding', 'SLA guarantee'] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-dark text-white">
      {/* Navigation */}
      <nav className="border-b border-navy-light sticky top-0 bg-navy-dark bg-opacity-95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-gold font-bold text-xl tracking-wide">ContractOS</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm py-2">Sign In</Link>
            <Link to="/signup" className="btn-primary text-sm py-2">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-navy border border-gold border-opacity-30 text-gold text-xs font-medium px-4 py-1.5 rounded-full mb-6">
          🇲🇾 Built for Malaysian Construction Companies
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
          One Platform for Your<br />
          <span className="text-gold">Entire Construction Business</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          ContractOS replaces spreadsheets, WhatsApp groups and disconnected tools with a single enterprise-grade system — built specifically for Malaysian contractors.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup" className="btn-primary text-base px-8 py-3">Start Free — No Credit Card</Link>
          <a href="#features" className="btn-secondary text-base px-8 py-3">See All Features</a>
        </div>
        <p className="text-gray-500 text-sm mt-4">5-day free trial on all paid features · PDPA 2010 compliant · Hosted in Malaysia</p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">Everything Your Team Needs</h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">16 modules covering every part of your construction business — from tender to final claim.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card hover:border-gold transition-colors group">
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="text-white font-semibold mb-2 group-hover:text-gold transition-colors">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 mt-3">Start free. Upgrade as you grow. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div key={tier.name} className={`card flex flex-col ${tier.highlight ? 'border-gold ring-1 ring-gold' : ''}`}>
              {tier.highlight && (
                <span className="text-xs font-semibold text-navy-dark bg-gold px-3 py-1 rounded-full self-start mb-4">Most Popular</span>
              )}
              <h3 className="text-white font-bold text-lg">{tier.name}</h3>
              <div className="mt-2 mb-1">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                <span className="text-gray-400 text-sm">{tier.period}</span>
              </div>
              <p className="text-gray-400 text-xs mb-5">{tier.users}</p>
              <ul className="space-y-2 flex-1 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-success mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={tier.cta === 'Contact Sales' ? '#contact' : '/signup'}
                className={tier.highlight ? 'btn-primary text-center' : 'btn-secondary text-center'}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            { q: 'Is my data stored in Malaysia?', a: 'Yes. ContractOS stores all primary data on AWS servers in Kuala Lumpur, fully compliant with PDPA 2010.' },
            { q: 'Can I use this on my phone?', a: 'Yes. ContractOS is a Progressive Web App (PWA) — you can install it on your Android or iOS phone and use it on site.' },
            { q: 'Does it support Bahasa Malaysia?', a: 'The landing page is bilingual (EN/BM). The app interface is in English, with BM support coming in a future update.' },
            { q: 'What payment methods do you accept?', a: 'We accept FPX (Malaysian online banking) and all major credit/debit cards via Stripe.' },
            { q: 'Can subcontractors access the system?', a: 'Yes. Subcontractors get their own limited login — they can only see their assigned scope, submit progress and track their claims.' },
            { q: 'Is there a contract? Can I cancel anytime?', a: 'No contracts. Monthly plans can be cancelled anytime. Yearly plans receive a pro-rated refund for unused months.' },
          ].map((item) => (
            <div key={item.q} className="card">
              <h3 className="text-white font-semibold mb-2">{item.q}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Get In Touch</h2>
        <p className="text-gray-400 text-center mb-10 text-sm">Have questions? We'd love to hear from you.</p>
        <div className="card space-y-4">
          <input type="text" placeholder="Your Name" className="input-field" />
          <input type="email" placeholder="Email Address" className="input-field" />
          <input type="text" placeholder="Company Name" className="input-field" />
          <textarea placeholder="Your message..." rows={4} className="input-field resize-none" />
          <button className="btn-primary w-full">Send Message</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-light mt-10">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gold font-bold text-lg">ContractOS</span>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <a href="mailto:hello@contractos.my" className="hover:text-white">hello@contractos.my</a>
          </div>
          <p className="text-gray-500 text-xs">© 2026 ContractOS Sdn Bhd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
