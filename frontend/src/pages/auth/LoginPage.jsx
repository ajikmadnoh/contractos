import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

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
    <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-gold font-bold text-3xl tracking-wide">ContractOS</Link>
          <p className="text-gray-400 mt-2 text-sm">Sign in to your workspace</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="bg-danger bg-opacity-20 border border-danger border-opacity-50 text-red-300 text-sm px-4 py-3 rounded-lg">
                {serverError}
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="input-field"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-gold hover:text-gold-light">Forgot password?</Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="input-field"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-gold hover:text-gold-light font-medium">Get started free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
