'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { ModalProps } from '@/components/ui/Modal';

export interface ConfirmDialogProps extends Pick<ModalProps, 'isOpen' | 'onClose'> {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
}

/**
 * Confirm dialog built on Modal.
 * Used for all destructive actions — delete, cancel, reject.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      closeOnOverlayClick={!isLoading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {/* Children optional — description covers most cases */}
      <span />
    </Modal>
  );
}
