import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../lib/api';

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
    verifying: { icon: '⏳', title: 'Verifying your email...', text: 'Please wait a moment.', color: 'text-gray-400' },
    success: { icon: '✅', title: 'Email verified!', text: 'Your account is ready. You can now sign in.', color: 'text-success' },
    invalid: { icon: '❌', title: 'Invalid or expired link', text: 'Please request a new verification email or contact support.', color: 'text-red-400' },
  }[status];

  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-5xl mb-4">{content.icon}</div>
        <h2 className={`text-xl font-bold mb-2 ${content.color}`}>{content.title}</h2>
        <p className="text-gray-400 text-sm mb-6">{content.text}</p>
        {status !== 'verifying' && (
          <Link to="/login" className="btn-primary inline-block">Go to Login</Link>
        )}
      </div>
    </div>
  );
}
