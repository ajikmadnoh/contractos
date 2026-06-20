import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import Icon from '../../components/Icon';
import BrandLogo from '../../components/BrandLogo';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    api.post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('invalid'));
  }, [token]);

  const content = {
    verifying: { 
      icon: 'loader', 
      title: 'Verifying your email...', 
      text: 'Please wait a moment while we process your request.', 
      color: 'var(--text)', 
      iconColor: 'var(--accent)',
      spin: true
    },
    success: { 
      icon: 'check', 
      title: 'Email verified!', 
      text: 'Your account has been successfully verified. You are ready to start using ContractOS.', 
      color: 'var(--good)', 
      iconColor: 'var(--good)'
    },
    invalid: { 
      icon: 'x', 
      title: 'Invalid or expired link', 
      text: 'The email verification link you used is invalid or has expired. Please request a new link or contact support.', 
      color: 'var(--danger)', 
      iconColor: 'var(--danger)'
    },
  }[status];

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <BrandLogo size={36} />
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>ContractOS</span>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)' }}>
            Enterprise construction management
          </p>
        </div>

        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: content.spin ? 'var(--accent-soft)' : content.iconColor === 'var(--good)' ? 'var(--good-soft)' : 'var(--danger-soft)',
            color: content.iconColor,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon 
              name={content.icon} 
              size={24} 
              className={content.spin ? 'animate-spin' : ''} 
              style={content.spin ? { animation: 'spin 1s linear infinite' } : {}}
            />
          </div>

          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: content.color, marginBottom: '6px' }}>
            {content.title}
          </h2>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: 1.5 }}>
            {content.text}
          </p>

          {status !== 'verifying' ? (
            <Link to="/login" className="btn primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              Go to Login
            </Link>
          ) : (
            <div style={{ height: 38 }} />
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
