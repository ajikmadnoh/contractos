import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/Icon';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [serverError, setServerError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

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
            Enterprise construction management
          </p>
        </div>

        <div className="login-card">
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            Sign in
          </h2>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: '24px' }}>
            Welcome back — enter your credentials
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
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="input"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--danger)' }}>{errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label">Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: 'var(--font-xs)', color: 'var(--accent)', textDecoration: 'none' }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="input"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && (
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--danger)' }}>{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)' }}>
              Don't have an account?{' '}
            </span>
            <Link
              to="/signup"
              style={{ fontSize: 'var(--font-sm)', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              Get started free
            </Link>
          </div>

          {/* Demo hint */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--font-xs)',
            color: 'var(--text-dim)',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--text-2)' }}>Demo credentials:</strong><br />
            director@demo.com / Demo1234!
          </div>
        </div>
      </div>
    </div>
  );
}
