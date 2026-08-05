'use client';

import { useSidebar as useSidebarContext } from '@/contexts/SidebarContext';

/**
 * Re-export useSidebar from context.
 * Components import from @/hooks/useSidebar, not directly from context.
 */
export { useSidebarContext as useSidebar };
