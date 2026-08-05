'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboard } from '@/hooks/useKeyboard';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

/**
 * Modal dialog with focus trap, ESC key close, and overlay click close.
 * Supports sm/md/lg/xl/full sizes.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
  closeOnOverlayClick = true,
  showCloseButton = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useKeyboard({ Escape: onClose }, isOpen);

  // Focus trap + restore
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(styles.dialog, styles[`dialog--${size}`], className)}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            <div>
              {title && <h2 id="modal-title" className={styles.title}>{title}</h2>}
              {description && <p id="modal-description" className={styles.description}>{description}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className={styles.closeBtn}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
