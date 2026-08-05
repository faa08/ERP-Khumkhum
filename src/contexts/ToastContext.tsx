'use client';

import React, { createContext, useCallback, useContext, useReducer } from 'react';
import type { Toast, ToastType } from '@/types/index';
import { generateId } from '@/lib/utils';
import { TOAST_DEFAULT_DURATION, TOAST_MAX_VISIBLE } from '@/lib/constants';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST': {
      const toasts = [action.payload, ...state.toasts].slice(0, TOAST_MAX_VISIBLE);
      return { toasts };
    }
    case 'REMOVE_TOAST':
      return { toasts: state.toasts.filter((t) => t.id !== action.payload) };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[];
  showToast: (
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string, duration = TOAST_DEFAULT_DURATION) => {
      const id = generateId('toast');
      dispatch({ type: 'ADD_TOAST', payload: { id, type, title, description, duration } });

      if (duration > 0) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', payload: id });
        }, duration);
      }
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
