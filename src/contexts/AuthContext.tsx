'use client';

import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import type { AuthState, LoginCredentials, User } from '@/types/auth';
import { STORAGE_KEYS, ROUTES } from '@/lib/constants';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { ...state, isLoading: false, user: action.payload, isAuthenticated: true, error: null };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false, error: action.payload, isAuthenticated: false };
    case 'LOGOUT':
      return { ...initialState };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: restore session from localStorage if remember me was set
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      // TODO Phase 2: validate token with backend, restore user session
      // For now, no auto-restore (session is cleared on refresh unless persisted)
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      // TODO Phase 2: Replace with real API call
      // Simulated login for Phase 1 (dev/testing only)
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        const mockUser: User = {
          id: '1',
          employeeId: 'EMP-001',
          name: 'Administrator',
          email: 'admin@khumkhum.id',
          role: 'super_admin',
          department: 'IT',
          isActive: true,
          lastLogin: new Date().toISOString(),
        };
        dispatch({ type: 'LOGIN_SUCCESS', payload: mockUser });

        if (credentials.rememberMe) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-token');
        }
      } else {
        dispatch({ type: 'LOGIN_ERROR', payload: 'Invalid username or password' });
      }
    } catch {
      dispatch({ type: 'LOGIN_ERROR', payload: 'An error occurred. Please try again.' });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    dispatch({ type: 'LOGOUT' });
    window.location.href = ROUTES.LOGIN;
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
