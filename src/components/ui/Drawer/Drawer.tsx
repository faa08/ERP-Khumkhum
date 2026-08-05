'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboard } from '@/hooks/useKeyboard';
import { X } from 'lucide-react';
import styles from './Drawer.module.css';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type DrawerPosition = 'left' | 'right';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: DrawerSize;
  position?: DrawerPosition;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  position = 'right',
  children,
  footer,
  className,
  closeOnOverlayClick = true,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useKeyboard({ Escape: onClose }, isOpen);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-describedby={description ? 'drawer-description' : undefined}
        className={cn(styles.drawer, styles[`drawer--${size}`], styles[`drawer--${position}`], className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            {title && <h2 id="drawer-title" className={styles.title}>{title}</h2>}
            {description && <p id="drawer-description" className={styles.description}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close drawer" className={styles.closeBtn}>
            <X size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
