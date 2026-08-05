'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuth } from '@/hooks/useAuth';
import type { NavGroup, NavItem } from '@/types/navigation';
import {
  LayoutDashboard,
  Factory,
  Package,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Settings,
  Database,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Scale,
  CalendarDays,
  LineChart
} from 'lucide-react';
import styles from './Sidebar.module.css';

// ─────────────────────────────────────────────
// NAVIGATION STRUCTURE
// ─────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} />,
  Factory:         <Factory size={16} />,
  Package:         <Package size={16} />,
  ShieldCheck:     <ShieldCheck size={16} />,
  ShoppingCart:    <ShoppingCart size={16} />,
  TrendingUp:      <TrendingUp size={16} />,
  Users:           <Users size={16} />,
  Settings:        <Settings size={16} />,
  Database:        <Database size={16} />,
  ClipboardList:   <ClipboardList size={16} />,
  Scale:           <Scale size={16} />,
  CalendarDays:    <CalendarDays size={16} />,
  LineChart:       <LineChart size={16} />,
};

type ProtectedNavGroup = Omit<NavGroup, 'items'> & {
  items: (NavItem & { requiredPermission?: string })[];
};

const NAV_GROUPS: ProtectedNavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', requiredPermission: 'dashboard' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'receiving',  label: 'Receiving',  href: '/receiving',  icon: 'ClipboardList', requiredPermission: 'inventory' },
      { id: 'sorting',    label: 'Sorting',    href: '/sorting',    icon: 'Scale',         requiredPermission: 'production' },
      { id: 'ppic',       label: 'PPIC',       href: '/ppic',       icon: 'CalendarDays',  requiredPermission: 'production' },
      { id: 'production', label: 'Production', href: '/production', icon: 'Factory',       requiredPermission: 'production' },
      { id: 'qc',         label: 'Quality Control', href: '/quality-control', icon: 'ShieldCheck', requiredPermission: 'qc' },
      { id: 'inventory',  label: 'Inventory',  href: '/inventory',  icon: 'Package',       requiredPermission: 'inventory' },
      { id: 'sales',      label: 'Sales',      href: '/sales',      icon: 'ShoppingCart',  requiredPermission: 'sales' },
      { id: 'traceability', label: 'Traceability', href: '/traceability', icon: 'LineChart', requiredPermission: 'reports' },
    ],
  },
  {
    id: 'master',
    label: 'Master Data',
    items: [
      {
        id: 'master-data',
        label: 'Master Data',
        icon: 'Database',
        requiredPermission: 'master',
        children: [
          { id: 'farmers', label: 'Farmers', href: '/master/farmers' },
          { id: 'products', label: 'Products', href: '/master/products' },
          { id: 'raw-materials', label: 'Raw Materials', href: '/master/raw-materials' },
          { id: 'customers', label: 'Customers', href: '/master/customers' },
          { id: 'warehouses', label: 'Warehouses', href: '/master/warehouses' },
          { id: 'prod-stds', label: 'Prod. Standards', href: '/master/production-standards' },
          { id: 'sort-stds', label: 'Sort Standards', href: '/master/sorting-standards' },
          { id: 'qc-stds', label: 'QC Standards', href: '/master/qc-standards' },
        ],
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { id: 'reports', label: 'Reports', href: '/reports', icon: 'TrendingUp', requiredPermission: 'reports' },
      { id: 'ai-forecast', label: 'AI Forecast', href: '/ai-forecast', icon: 'LineChart', requiredPermission: 'reports' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: 'Settings',
        requiredPermission: 'settings',
        children: [
          { id: 'general', label: 'General Settings', href: '/settings' },
          { id: 'users', label: 'User Management', href: '/settings/users' },
          { id: 'audit', label: 'Audit Log', href: '/settings/audit-log' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────
// SIDEBAR ITEM
// ─────────────────────────────────────────────

interface SidebarItemProps {
  item: NavItem;
  isCollapsed: boolean;
  depth?: number;
}

function SidebarItem({ item, isCollapsed, depth = 0 }: SidebarItemProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + '/')
    : false;
  const hasChildren = item.children && item.children.length > 0;
  const icon = item.icon ? ICON_MAP[item.icon] : null;

  if (hasChildren) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setIsExpanded((p) => !p)}
          aria-expanded={isExpanded}
          className={cn(
            styles.item,
            isActive && styles['item--active'],
            depth > 0 && styles['item--nested'],
            isCollapsed && styles['item--collapsed']
          )}
          title={isCollapsed ? item.label : undefined}
        >
          {icon && <span className={styles.itemIcon}>{icon}</span>}
          {!isCollapsed && (
            <>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemChevron}>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
            </>
          )}
        </button>
        {isExpanded && !isCollapsed && (
          <ul className={styles.children}>
            {item.children!.map((child) => (
              <SidebarItem key={child.id} item={child} isCollapsed={false} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            styles.item,
            isActive && styles['item--active'],
            depth > 0 && styles['item--nested'],
            isCollapsed && styles['item--collapsed']
          )}
          title={isCollapsed ? item.label : undefined}
          aria-current={isActive ? 'page' : undefined}
        >
          {icon && <span className={styles.itemIcon}>{icon}</span>}
          {!isCollapsed && <span className={styles.itemLabel}>{item.label}</span>}
          {!isCollapsed && item.badge !== undefined && (
            <span className={styles.itemBadge}>{item.badge}</span>
          )}
        </Link>
      </li>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────

export function Sidebar() {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();

  // Filter navigation groups based on RBAC
  const filteredGroups = React.useMemo(() => {
    if (!user) return [];
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ROLE_PERMISSIONS } = require('@/types/auth');
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const isSuperAdmin = userPermissions.includes('*');

    return NAV_GROUPS.map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (isSuperAdmin) return true;
        if (!item.requiredPermission) return true;
        return userPermissions.includes(item.requiredPermission);
      });
      return { ...group, items: filteredItems };
    }).filter((group) => group.items.length > 0);
  }, [user]);

  return (
    <aside
      className={cn(styles.sidebar, isCollapsed && styles['sidebar--collapsed'])}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon} aria-hidden="true">
          KK
        </div>
        {!isCollapsed && (
          <div className={styles.brandText}>
            <span className={styles.brandName}>KhumKhum</span>
            <span className={styles.brandTagline}>ERP System</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(styles.nav, 'scroll-area')} aria-label="Navigation">
        {filteredGroups.map((group, groupIdx) => (
          <div key={group.id} className={styles.group}>
            {!isCollapsed && (
              <p className={styles.groupLabel} aria-hidden="true">
                {group.label}
              </p>
            )}
            {isCollapsed && groupIdx > 0 && (
              <hr className={styles.groupDivider} aria-hidden="true" />
            )}
            <ul className={styles.groupItems} role="list">
              {group.items.map((item) => (
                <SidebarItem key={item.id} item={item} isCollapsed={isCollapsed} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
