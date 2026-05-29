import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

const STEPS = [
  { id: 1, title: 'Company Details', desc: 'Tell us about your company' },
  { id: 2, title: 'Business Info', desc: 'Registration and contact details' },
  { id: 3, title: 'You\'re Ready!', desc: 'Start using ContractOS' },
];

export default function SetupWizardPage() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    if (step < 2) { setStep(s => s + 1); return; }
    setSaving(true);
    try {
      await api.patch('/tenants/setup', data);
      updateUser({ setupComplete: true });
      setStep(3);
    } catch {
      // continue anyway
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to ContractOS!</h2>
          <p className="text-gray-400 text-sm mb-8">
            Your workspace is ready. Let's get you started with your first project.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
              Go to Dashboard
            </button>
            <button onClick={() => navigate('/dashboard/projects')} className="btn-secondary w-full">
              Create First Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-gold font-bold text-2xl tracking-wide">ContractOS</span>
          <p className="text-gray-400 mt-1 text-sm">Let's set up your workspace</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.slice(0, 2).map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s.id ? 'bg-gold text-navy-dark' : 'bg-navy-light text-gray-400'
              }`}>
                {s.id}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step >= s.id ? 'text-white' : 'text-gray-500'}`}>
                {s.title}
              </span>
              {i < 1 && <div className={`w-12 h-0.5 mx-1 ${step > s.id ? 'bg-gold' : 'bg-navy-light'}`} />}
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-1">{STEPS[step - 1].title}</h2>
          <p className="text-gray-400 text-sm mb-6">{STEPS[step - 1].desc}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="label">Company Name</label>
                  <input className="input-field" placeholder="Syarikat Binaan Sdn Bhd"
                    defaultValue={user?.companyName}
                    {...register('companyName', { required: true })} />
                </div>
                <div>
                  <label className="label">Company Logo URL <span className="text-gray-500 font-normal">(optional)</span></label>
                  <input className="input-field" placeholder="https://yourcompany.com/logo.png"
                    {...register('companyLogoUrl')} />
                  <p className="text-xs text-gray-500 mt-1">You can upload a logo later from Settings.</p>
                </div>
                <div>
                  <label className="label">Primary Brand Colour <span className="text-gray-500 font-normal">(optional)</span></label>
                  <div className="flex gap-3 items-center">
                    <input type="color" defaultValue="#C9A84C" className="w-12 h-10 rounded cursor-pointer bg-transparent border-0"
                      {...register('primaryColor')} />
                    <span className="text-gray-400 text-sm">This colour will appear on your documents and emails.</span>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="label">SSM Registration Number <span className="text-gray-500 font-normal">(optional)</span></label>
                  <input className="input-field" placeholder="e.g. 1234567-X"
                    {...register('ssmNumber')} />
                </div>
                <div>
                  <label className="label">Company Address</label>
                  <textarea rows={3} className="input-field resize-none" placeholder="No. 1, Jalan Binaan, 50000 Kuala Lumpur"
                    {...register('address')} />
                </div>
                <div>
                  <label className="label">Company Phone</label>
                  <input className="input-field" placeholder="+60 3-1234 5678"
                    {...register('phone')} />
                </div>
                <div>
                  <label className="label">Company Website <span className="text-gray-500 font-normal">(optional)</span></label>
                  <input className="input-field" placeholder="https://yourcompany.com"
                    {...register('website')} />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn-ghost flex-1">
                  Back
                </button>
              )}
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : step === 2 ? 'Finish Setup' : 'Continue'}
              </button>
            </div>

            <button type="button" onClick={() => navigate('/dashboard')}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 pt-1">
              Skip for now — I'll do this later
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
