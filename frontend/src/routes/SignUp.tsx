import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const plan = localStorage.getItem('selectedPlan');
    if (plan) {
      setSelectedPlan(plan);
    }
  }, []);

  const formattedPlan = useMemo(() => {
    if (!selectedPlan) {
      return null;
    }
    const normalized = selectedPlan.replace(/[-_]+/g, ' ').trim();
    if (!normalized) {
      return null;
    }
    return normalized
      .split(' ')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }, [selectedPlan]);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

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

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setErrors({});
      const registration = await signup(formData.name, formData.email, formData.password);

      if (registration.verificationRequired) {
        localStorage.removeItem('selectedPlan');
        localStorage.setItem('pendingVerificationEmail', formData.email);
        localStorage.setItem('pendingVerificationExpiresAt', registration.verificationExpiresAt);

        const routeState: Record<string, unknown> = {
          email: formData.email,
          verificationExpiresAt: registration.verificationExpiresAt,
        };

        if (registration.debugCode && import.meta.env.DEV) {
          routeState.debugCode = registration.debugCode;
        }

        navigate('/verify-email', { replace: true, state: routeState });
        return;
      }

      localStorage.removeItem('selectedPlan');
      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingVerificationExpiresAt');

      navigate('/login', {
        replace: true,
        state: {
          message: 'Account created successfully. You can sign in now.',
        },
      });
    } catch (cause) {
      let message = 'Failed to create account';

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
        <h1 className="text-3xl font-bold mb-6 text-center">Sign Up</h1>
        {formattedPlan && (
          <div className="mb-6 rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
            Locked in from pricing: <span className="font-semibold text-purple-50">{formattedPlan}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-indigo-900/50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
              required
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>
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
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
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
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-indigo-900/50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
              required
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg transition-colors"
          >
            Sign Up
          </button>
          {errors.general && <p className="text-center text-sm text-red-400">{errors.general}</p>}
        </form>
        <p className="mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;