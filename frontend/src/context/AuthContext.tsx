import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
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
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
    await apiClient.post(`${API_ENDPOINTS.AUTH}/register`, {
      name,
      email,
      password,
    });
  };

  const logout = () => {
    setUser(null);
    persistSession(null, null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};