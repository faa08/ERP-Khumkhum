'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

interface SidebarContextValue {
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Restore persisted sidebar state
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored) as boolean);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(next));
      return next;
    });
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'true');
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'false');
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle, collapse, expand }}>
      {children}
    </SidebarContext.Provider>
  );
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
