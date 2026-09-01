'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { UserPayload } from '@careerforge/types';

interface AuthContextType {
  user: UserPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'CANDIDATE' | 'RECRUITER', name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Silent token refresh and session restoration on startup
  const restoreSession = useCallback(async () => {
    try {
      // Attempt refresh via HTTP-only cookie
      const res = await api.post<{ user: UserPayload; accessToken: string; expiresIn: string }>('/auth/refresh');
      api.setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    } catch {
      // Session unavailable or expired
      api.setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ user: UserPayload; accessToken: string; expiresIn: string }>('/auth/login', {
        email,
        password,
      });
      api.setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, role: 'CANDIDATE' | 'RECRUITER', name?: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ user: UserPayload; accessToken: string; expiresIn: string }>('/auth/register', {
        email,
        password,
        role,
        name,
      });
      api.setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request completed with warning:', e);
    } finally {
      api.setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
