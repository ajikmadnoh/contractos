import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';

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
      <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm mb-6">
            We sent a verification link to your email. Click it to activate your account.
          </p>
          <Link to="/login" className="btn-primary inline-block">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-gold font-bold text-3xl tracking-wide">ContractOS</Link>
          <p className="text-gray-400 mt-2 text-sm">Create your company workspace</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="bg-danger bg-opacity-20 border border-danger border-opacity-50 text-red-300 text-sm px-4 py-3 rounded-lg">
                {serverError}
              </div>
            )}

            <div>
              <label className="label">Your Full Name</label>
              <input
                type="text"
                placeholder="Ahmad bin Abdullah"
                className="input-field"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                placeholder="Syarikat Binaan Sdn Bhd"
                className="input-field"
                {...register('companyName', { required: 'Company name is required' })}
              />
              {errors.companyName && <p className="text-red-400 text-xs mt-1">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="label">Work Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="input-field"
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' } })}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                className="input-field"
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat your password"
                className="input-field"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (val) => val === watch('password') || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <p className="text-xs text-gray-500">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-gold hover:underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="text-gold hover:underline">Privacy Policy</Link>.
            </p>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:text-gold-light font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
