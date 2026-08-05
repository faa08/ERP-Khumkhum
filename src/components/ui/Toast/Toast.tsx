'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Toast as ToastType } from '@/types/index';
import { useToastContext } from '@/contexts/ToastContext';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import styles from './Toast.module.css';

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger:  XCircle,
  info:    Info,
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = ICONS[toast.type];
  return (
    <div role="alert" aria-live="polite" className={cn(styles.toast, styles[`toast--${toast.type}`])}>
      <Icon size={16} className={styles.icon} aria-hidden="true" />
      <div className={styles.content}>
        <p className={styles.title}>{toast.title}</p>
        {toast.description && <p className={styles.description}>{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className={styles.dismissBtn}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Toast container — renders active toasts.
 * Place once in the root layout.
 */
export function ToastContainer() {
  const { toasts, dismissToast } = useToastContext();

  if (toasts.length === 0) return null;

  return (
    <div
      className={styles.container}
      aria-label="Notifications"
      role="region"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
