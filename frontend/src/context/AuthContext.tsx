import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import { isAxiosError } from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  isEmailVerified?: boolean;
  lastLoginAt?: string | null;
  walletBalance?: string;
  verificationFailedAttempts?: number;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

interface RegisterResponse {
  verificationRequired: boolean;
  email: string;
  userId: string;
  verificationExpiresAt: string;
  debugCode?: string;
}

interface ResendVerificationResponse {
  email: string;
  verificationExpiresAt: string;
  debugCode?: string;
  verificationFailedAttempts?: number;
}

interface PasswordResetRequestResponse {
  email: string;
  requested: boolean;
  message: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (name: string, email: string, password: string) => Promise<RegisterResponse>;
  verifyEmail: (email: string, code: string) => Promise<AuthUser>;
  resendVerification: (email: string) => Promise<ResendVerificationResponse>;
  requestPasswordReset: (email: string) => Promise<PasswordResetRequestResponse>;
  completePasswordReset: (email: string, token: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export class PasswordResetError extends Error {
  attempts?: number;
  requiresNewToken?: boolean;

  constructor(message: string, attempts?: number, requiresNewToken?: boolean) {
    super(message);
    this.name = 'PasswordResetError';
    this.attempts = attempts;
    this.requiresNewToken = requiresNewToken;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setUser(parsedUser);
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  const persistSession = (authUser: AuthUser | null, token?: string | null) => {
    if (authUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    if (typeof token === 'string') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else if (token === null) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<AuthUser>(`${API_ENDPOINTS.AUTH}/me`);
      setUser(response.data);
      persistSession(response.data);
    } catch {
      setUser(null);
      persistSession(null, null);
      queryClient.clear();
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<LoginResponse>(`${API_ENDPOINTS.AUTH}/login`, {
      email,
      password,
    });

    const { access_token, user: authUser } = response.data;
    queryClient.clear();
    setUser(authUser);
    persistSession(authUser, access_token);
    return authUser;
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await apiClient.post<RegisterResponse>(`${API_ENDPOINTS.AUTH}/register`, {
      name,
      email,
      password,
    });

    return response.data;
  };

  const verifyEmail = async (email: string, code: string) => {
    const response = await apiClient.post<LoginResponse>(`${API_ENDPOINTS.AUTH}/verify-email`, {
      email,
      code,
    });

    const { access_token, user: authUser } = response.data;
    queryClient.clear();
    setUser(authUser);
    persistSession(authUser, access_token);
    return authUser;
  };

  const resendVerification = async (email: string) => {
    const response = await apiClient.post<ResendVerificationResponse>(`${API_ENDPOINTS.AUTH}/resend-verification`, {
      email,
    });

    return response.data;
  };

  const requestPasswordReset = async (email: string) => {
    const response = await apiClient.post<PasswordResetRequestResponse>(
      `${API_ENDPOINTS.AUTH}/password-reset/request`,
      { email },
    );

    return response.data;
  };

  const completePasswordReset = async (email: string, token: string, password: string) => {
    try {
      const response = await apiClient.post<LoginResponse>(
        `${API_ENDPOINTS.AUTH}/password-reset/complete`,
        {
          email,
          token,
          password,
        },
      );

      const { access_token, user: authUser } = response.data;
      queryClient.clear();
      setUser(authUser);
      persistSession(authUser, access_token);
      return authUser;
    } catch (error) {
      const fallbackMessage =
        'We could not reset your password. Double-check the token and try again.';

      if (isAxiosError(error)) {
        const data = (error.response?.data ?? {}) as {
          message?: string;
          passwordResetAttempts?: number;
          requiresNewToken?: boolean;
        };

        const message =
          typeof data.message === 'string' && data.message.trim().length > 0
            ? data.message
            : fallbackMessage;

        throw new PasswordResetError(
          message,
          data.passwordResetAttempts,
          data.requiresNewToken,
        );
      }

      if (error instanceof Error && error.message) {
        throw new PasswordResetError(error.message);
      }

      throw new PasswordResetError(fallbackMessage);
    }
  };

  const logout = () => {
    setUser(null);
    persistSession(null, null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        verifyEmail,
        resendVerification,
        requestPasswordReset,
        completePasswordReset,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};