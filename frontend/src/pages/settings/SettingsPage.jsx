import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/Icon';

const TABS = [
  { id: 'company', label: 'Company', icon: 'building' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'billing', label: 'Billing', icon: 'creditcard' },
  { id: 'api', label: 'API Keys', icon: 'key' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('company');
  const user = useAuthStore(s => s.user);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your workspace and account settings</p>
        </div>
      </div>
      <div className="page-body" style={{ display: 'flex', gap: '24px' }}>
        {/* Sidebar */}
        <nav style={{ width: '180px', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`nav-item${tab === t.id ? ' active' : ''}`}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {tab === 'company' && <CompanySettings />}
          {tab === 'security' && <SecuritySettings />}
          {tab === 'billing' && <BillingSettings user={user} />}
          {tab === 'api' && <APISettings />}
        </div>
      </div>
    </>
  );
}

function CompanySettings() {
  const { register, handleSubmit, formState: { isSubmitting, isDirty } } = useForm();
  const [saved, setSaved] = useState(false);

  const onSubmit = async (data) => {
    try { await api.patch('/tenants/setup', data); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (err) { alert(err.response?.data?.error || 'Failed to save.'); }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-5">Company Settings</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        <div>
          <label className="label">Company Name</label>
          <input className="input-field" {...register('companyName')} />
        </div>
        <div>
          <label className="label">SSM Registration Number</label>
          <input className="input-field" placeholder="1234567-X" {...register('ssmNumber')} />
        </div>
        <div>
          <label className="label">Company Address</label>
          <textarea rows={3} className="input-field resize-none" {...register('address')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input-field" {...register('phone')} />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input-field" placeholder="https://" {...register('website')} />
          </div>
        </div>
        <div>
          <label className="label">Change Order Threshold (RM)</label>
          <input type="number" className="input-field" placeholder="10000" {...register('changeOrderThreshold')} />
          <p className="text-xs text-gray-500 mt-1">Change orders below this value are auto-approved.</p>
        </div>
        <div>
          <label className="label">Session Timeout (minutes)</label>
          <input type="number" className="input-field" placeholder="30" min="5" max="480" {...register('sessionTimeoutMinutes')} />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-success text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12} /> Saved successfully</span>}
        </div>
      </form>
    </div>
  );
}

function SecuritySettings() {
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm();
  const [done, setDone] = useState(false);

  const onSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) { alert('Passwords do not match.'); return; }
    try { await api.patch('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword }); setDone(true); }
    catch (err) { alert(err.response?.data?.error || 'Failed.'); }
  };

  return (
    <div className="space-y-5">
      <div className="card max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-5">Change Password</h2>
        {done ? (
          <p className="text-success text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12} /> Password changed successfully.</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input-field" {...register('currentPassword', { required: true })} />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input-field" {...register('newPassword', { required: true, minLength: 8 })} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input-field" {...register('confirmPassword', { required: true })} />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      <div className="card max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Two-Factor Authentication</h2>
        <p className="text-gray-400 text-sm mb-4">Add an extra layer of security to your account.</p>
        <button className="btn-secondary text-sm">Enable 2FA</button>
        <p className="text-xs text-gray-500 mt-2">Coming in Phase 2 — AWS Cognito integration.</p>
      </div>
    </div>
  );
}

function BillingSettings({ user }) {
  const TIER_LABELS = { free:'Free', pro:'Pro', business:'Business', enterprise:'Enterprise' };

  return (
    <div className="space-y-5">
      <div className="card max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
        <div className="flex items-center justify-between p-4 bg-navy-dark rounded-lg mb-4">
          <div>
            <p className="text-white font-semibold text-lg">{TIER_LABELS[user?.subscriptionTier] || 'Free'} Plan</p>
            <p className="text-gray-400 text-sm mt-0.5">
              {user?.subscriptionTier === 'free' ? 'Up to 3 users · Basic features' : 'Your current subscription'}
            </p>
          </div>
          <span className="badge-success">{user?.subscriptionTier === 'free' ? 'Free' : 'Active'}</span>
        </div>
        <button className="btn-primary w-full">Upgrade Plan</button>
        <p className="text-xs text-gray-500 mt-2 text-center">Stripe integration — coming in next sprint.</p>
      </div>

      <div className="card max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Payment Methods</h2>
        <p className="text-gray-400 text-sm mb-4">Manage your FPX or credit/debit card details.</p>
        <button className="btn-secondary text-sm">Manage Payment Methods</button>
        <p className="text-xs text-gray-500 mt-2">Handled securely via Stripe — coming in next sprint.</p>
      </div>
    </div>
  );
}

function APISettings() {
  const [keys, setKeys] = useState([]);
  const [generating, setGenerating] = useState(false);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/settings/api-keys');
      setKeys(k => [...k, res.data]);
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="card max-w-lg">
      <h2 className="text-lg font-semibold text-white mb-2">API Keys</h2>
      <p className="text-gray-400 text-sm mb-5">Use API keys to connect ContractOS to external systems like SQL Account, QuickBooks or Xero.</p>

      {keys.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-navy-light rounded-lg mb-4">
          <p className="text-gray-500 text-sm">No API keys generated yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between p-3 bg-navy-dark rounded-lg">
              <code className="text-xs text-gold font-mono">{k.key}</code>
              <span className="text-xs text-gray-500">{k.createdAt}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={generateKey} disabled={generating} className="btn-primary w-full">
        {generating ? 'Generating...' : '+ Generate New API Key'}
      </button>
      <p className="text-xs text-gray-500 mt-2 text-center">Available on Business and Enterprise plans.</p>
    </div>
  );
}
