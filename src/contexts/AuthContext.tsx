'use client';

import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import type { AuthState, LoginCredentials, User } from '@/types/auth';
import { ROUTES } from '@/lib/constants';
import { loginAction, logoutAction, getAuthSessionAction } from '@/actions/auth';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_INITIAL_USER'; payload: User | null };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // initial checking
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
      return { ...initialState, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_INITIAL_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
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

  // Check active session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await getAuthSessionAction();
        if (res.success && res.user) {
          const userObj: User = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
            isActive: true,
          };
          dispatch({ type: 'SET_INITIAL_USER', payload: userObj });
        } else {
          dispatch({ type: 'SET_INITIAL_USER', payload: null });
        }
      } catch {
        dispatch({ type: 'SET_INITIAL_USER', payload: null });
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const res = await loginAction({
        username: credentials.username,
        password: credentials.password,
      });

      if (res.success && res.user) {
        const userObj: User = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          isActive: true,
        };
        dispatch({ type: 'LOGIN_SUCCESS', payload: userObj });
        return true;
      } else {
        dispatch({ type: 'LOGIN_ERROR', payload: res.error || 'Gagal masuk. Periksa username dan password.' });
        return false;
      }
    } catch (err: any) {
      dispatch({ type: 'LOGIN_ERROR', payload: err.message || 'Terjadi kesalahan sistem' });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutAction();
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
