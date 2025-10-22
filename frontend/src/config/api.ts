// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// API endpoints will automatically use this base URL
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  INVESTMENTS: '/api/investments',
  PLANS: '/api/plans',
  TRANSACTIONS: '/api/transactions',
  NOTIFICATIONS: '/api/notifications',
  PAYMENTS: '/api/payments',
  ADMIN: '/api/admin',
};

console.log('API Base URL:', API_BASE_URL);
