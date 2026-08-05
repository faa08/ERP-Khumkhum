'use client';

import { useState, useCallback } from 'react';

/**
 * Manages modal open/close state with optional data payload.
 *
 * Usage:
 * const modal = useModal<MyDataType>();
 * modal.open(rowData);
 * modal.isOpen
 * modal.data
 * modal.close()
 */
export function useModal<T = undefined>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(undefined);

  const open = useCallback((payload?: T) => {
    setData(payload);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Small delay to allow close animation before clearing data
    setTimeout(() => setData(undefined), 200);
  }, []);

  return { isOpen, data, open, close } as const;
}
