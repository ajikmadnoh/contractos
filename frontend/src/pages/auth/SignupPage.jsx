import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const fieldError = { fontSize: 'var(--font-xs)', color: 'var(--danger)' };

export default function SignupPage() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await api.post('/auth/signup', {
        name: data.name,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
      });
      setSuccess(true);
    } catch (err) {
      setServerError(err.response?.data?.error || 'Signup failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="login-page">
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="check" size={26} />
            </div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Check your email
            </h2>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: 1.5 }}>
              We sent a verification link to your email. Click it to activate your account.
            </p>
            <Link to="/login" className="btn primary" style={{ width: '100%', justifyContent: 'center' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="brand-mark" style={{ width: '36px', height: '36px', fontSize: '18px', borderRadius: '10px' }}>C</div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>ContractOS</span>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)' }}>
            Create your company workspace
          </p>
        </div>

        <div className="login-card">
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            Get started free
          </h2>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: '24px' }}>
            Set up your workspace in under a minute
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {serverError && (
              <div style={{
                background: 'var(--danger-soft)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                fontSize: 'var(--font-sm)',
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Icon name="alert" size={14} />
                {serverError}
              </div>
            )}

            <div className="form-group">
              <label className="label">Your Full Name</label>
              <input
                type="text"
                placeholder="Ahmad bin Abdullah"
                className="input"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <span style={fieldError}>{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Company Name</label>
              <input
                type="text"
                placeholder="Syarikat Binaan Sdn Bhd"
                className="input"
                {...register('companyName', { required: 'Company name is required' })}
              />
              {errors.companyName && <span style={fieldError}>{errors.companyName.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Work Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="input"
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' } })}
              />
              {errors.email && <span style={fieldError}>{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                className="input"
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
              />
              {errors.password && <span style={fieldError}>{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat your password"
                className="input"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (val) => val === watch('password') || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && <span style={fieldError}>{errors.confirmPassword.message}</span>}
            </div>

            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              By signing up, you agree to our{' '}
              <Link to="/terms" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Terms of Service</Link> and{' '}
              <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</Link>.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
            >
              {isSubmitting ? 'Creating account…' : 'Create Free Account'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)' }}>
              Already have an account?{' '}
            </span>
            <Link
              to="/login"
              style={{ fontSize: 'var(--font-sm)', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
