import { useMemo } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import type { ToastType } from '@/types/index';

/**
 * Convenience hook for showing toasts.
 *
 * Usage:
 * const toast = useToast();
 * toast.success('Saved successfully');
 * toast.error('Failed to save');
 * toast.warning('Low stock detected');
 * toast.info('Processing...');
 */
export function useToast() {
  const { showToast, dismissToast, toasts } = useToastContext();

  return useMemo(
    () => ({
      toasts,
      dismiss: dismissToast,
      success: (title: string, description?: string) =>
        showToast('success', title, description),
      error: (title: string, description?: string) =>
        showToast('danger', title, description),
      warning: (title: string, description?: string) =>
        showToast('warning', title, description),
      info: (title: string, description?: string) =>
        showToast('info', title, description),
      show: (type: ToastType, title: string, description?: string, duration?: number) =>
        showToast(type, title, description, duration),
    }),
    [showToast, dismissToast, toasts]
  );
}
