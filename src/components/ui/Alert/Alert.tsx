import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import styles from './Alert.module.css';

export type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger:  XCircle,
  info:    Info,
};

/**
 * Inline alert for page-level messages.
 * Use Toast for transient notifications, Alert for persistent messages.
 */
export function Alert({ variant = 'info', title, children, dismissible, onDismiss, className }: AlertProps) {
  const Icon = ICONS[variant];
  return (
    <div
      role="alert"
      className={cn(styles.alert, styles[`alert--${variant}`], className)}
    >
      <Icon size={15} className={styles.icon} aria-hidden="true" />
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
      {dismissible && onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className={styles.dismissBtn}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
