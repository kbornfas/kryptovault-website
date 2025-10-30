import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const authUser = await login(formData.email, formData.password);
      const isAdmin = authUser.role?.toUpperCase() === 'ADMIN';
      const destination = isAdmin ? '/admin' : '/';
      navigate(destination, { replace: true });
    } catch (cause) {
      if (isAxiosError<{ message?: string | string[]; requiresVerification?: boolean; email?: string; verificationExpiresAt?: string; debugCode?: string; verificationFailedAttempts?: number }>(cause)) {
        const payload = cause.response?.data;
        if (payload?.requiresVerification && payload.email) {
          localStorage.setItem('pendingVerificationEmail', payload.email);
          if (payload.verificationExpiresAt) {
            localStorage.setItem('pendingVerificationExpiresAt', payload.verificationExpiresAt);
          }
          if (import.meta.env.DEV && payload.debugCode) {
            localStorage.setItem('pendingVerificationDebugCode', payload.debugCode);
          }
          if (typeof payload.verificationFailedAttempts === 'number') {
            localStorage.setItem('verificationExpiredCount', String(payload.verificationFailedAttempts));
          }
          navigate('/verify-email', {
            replace: true,
            state: {
              email: payload.email,
              verificationExpiresAt: payload.verificationExpiresAt,
              debugCode: payload.debugCode,
            },
          });
          return;
        }
      }

      let message = 'Invalid email or password';
      if (isAxiosError<{ message?: string | string[] }>(cause)) {
        const description = cause.response?.data?.message;
        if (Array.isArray(description) && description.length > 0) {
          message = description[0];
        } else if (typeof description === 'string' && description.trim()) {
          message = description;
        }
      } else if (cause instanceof Error && cause.message.trim()) {
        message = cause.message;
      }
      setErrors({
        general: message,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[80vh]">
      <div className="w-full max-w-md bg-indigo-900/30 p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-indigo-900/50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-indigo-900/50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg transition-colors"
          >
            Login
          </button>
          <div className="mt-2 text-center text-sm">
            <Link to="/reset-password" className="text-purple-400 hover:text-purple-300">
              Forgot your password? Reset it here.
            </Link>
          </div>
          {errors.general && (
            <p className="text-red-400 text-sm text-center">{errors.general}</p>
          )}
        </form>
        <div className="mt-6 rounded-lg border border-indigo-500/40 bg-indigo-950/40 p-4 text-sm text-indigo-100">
          <p className="font-semibold text-indigo-50">QA Test Account</p>
          <p className="mt-2 leading-relaxed">
            Use <span className="font-mono">vip@kryptovault.demo</span> with password <span className="font-mono">TraderPass123!</span> to sign in. This demo wallet is preloaded with a $5,000 balance.
          </p>
        </div>
        <p className="mt-4 text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-purple-400 hover:text-purple-300">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;