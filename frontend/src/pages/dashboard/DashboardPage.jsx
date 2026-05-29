import useAuthStore from '../../store/authStore';

const kpiCards = [
  { label: 'Active Projects', value: '—', icon: '📁', color: 'border-gold' },
  { label: 'Outstanding Invoices', value: '—', icon: '🧾', color: 'border-yellow-500' },
  { label: 'Overdue Payments', value: '—', icon: '⚠️', color: 'border-danger-light' },
  { label: 'Staff On-Site Today', value: '—', icon: '👷', color: 'border-success' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm capitalize">
          {user?.role} · {user?.companyName}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {kpiCards.map((card) => (
          <div key={card.label} className={`card border-l-4 ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <span className="text-3xl opacity-60">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon modules grid */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: 'Projects', icon: '📁', ready: false },
            { name: 'Finance', icon: '💰', ready: false },
            { name: 'Invoicing', icon: '🧾', ready: false },
            { name: 'HR', icon: '👥', ready: false },
            { name: 'Tender / BQ', icon: '📋', ready: false },
            { name: 'Inventory', icon: '📦', ready: false },
            { name: 'Documents', icon: '📄', ready: false },
            { name: 'Profiles', icon: '🏢', ready: false },
            { name: 'Safety', icon: '🛡️', ready: false },
            { name: 'CRM', icon: '🎯', ready: false },
            { name: 'Fleet', icon: '🚛', ready: false },
            { name: 'Market Rates', icon: '📊', ready: false },
          ].map((mod) => (
            <div
              key={mod.name}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-navy-light border border-navy-light hover:border-gold cursor-pointer transition-colors group"
            >
              <span className="text-xl">{mod.icon}</span>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-gold transition-colors">{mod.name}</p>
                <p className="text-xs text-gray-500">Coming soon</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
