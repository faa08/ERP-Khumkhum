'use client';

import { useEffect } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;
type KeyMap = Partial<Record<string, KeyHandler>>;

/**
 * Bind keyboard shortcuts declaratively.
 *
 * Usage:
 * useKeyboard({
 *   'Escape': () => closeModal(),
 *   'Enter': (e) => { e.preventDefault(); submit(); },
 * });
 */
export function useKeyboard(keyMap: KeyMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      const fn = keyMap[event.key];
      if (fn) fn(event);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [keyMap, enabled]);
}
