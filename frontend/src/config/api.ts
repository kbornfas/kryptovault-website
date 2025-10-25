// API configuration
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

// Centralized endpoints for reuse throughout the app
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  INVESTMENTS: '/investments',
  PLANS: '/plans',
  TRANSACTIONS: '/transactions',
  NOTIFICATIONS: '/notifications',
  PAYMENTS: '/payments',
  ADMIN: '/admin',
  TRADES: '/trades',
  AUTOMATION: '/automation',
};
