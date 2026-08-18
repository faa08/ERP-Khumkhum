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
    label: 'Utama',
    items: [
      { id: 'dashboard', label: 'Dashboard Utama', href: '/dashboard', icon: 'LayoutDashboard', requiredPermission: 'dashboard' },
    ],
  },
  {
    id: 'operations',
    label: 'Operasional',
    items: [
      { id: 'receiving',  label: 'Inbound (Penerimaan)',  href: '/receiving',  icon: 'ClipboardList', requiredPermission: 'receiving' },
      { id: 'sorting',    label: 'Sortasi & Grading',    href: '/sorting',    icon: 'Scale',         requiredPermission: 'sorting' },
      { id: 'ppic',       label: 'PPIC & Jadwal',       href: '/ppic',       icon: 'CalendarDays',  requiredPermission: 'ppic' },
      { id: 'production', label: 'Produksi & Rendemen', href: '/production', icon: 'Factory',       requiredPermission: 'production' },
      { id: 'qc',         label: 'Quality Control (QC)', href: '/quality-control', icon: 'ShieldCheck', requiredPermission: 'qc' },
      { id: 'inventory',  label: 'Inventaris & Mutasi',  href: '/inventory',  icon: 'Package',       requiredPermission: 'inventory' },
      { id: 'traceability', label: 'Ketertelusuran', href: '/traceability', icon: 'LineChart', requiredPermission: 'traceability' },
    ],
  },
  {
    id: 'master',
    label: 'Data Induk',
    items: [
      {
        id: 'master-data',
        label: 'Master Data',
        icon: 'Database',
        requiredPermission: 'master',
        children: [
          { id: 'farmers', label: 'Petani Mitra', href: '/master/farmers' },
          { id: 'products', label: 'Produk Jadi', href: '/master/products' },
          { id: 'raw-materials', label: 'Bahan Baku', href: '/master/raw-materials' },
          { id: 'customers', label: 'Pelanggan', href: '/master/customers' },
          { id: 'warehouses', label: 'Gudang', href: '/master/warehouses' },
          { id: 'prod-stds', label: 'Standar Produksi', href: '/master/production-standards', requiredPermission: 'production' },
          { id: 'sort-stds', label: 'Standar Sortasi', href: '/master/sorting-standards', requiredPermission: 'qc' },
          { id: 'qc-stds', label: 'Standar QC', href: '/master/qc-standards', requiredPermission: 'qc' },
        ],
      },
    ],
  },
  {
    id: 'management',
    label: 'Manajemen',
    items: [
      { id: 'reports', label: 'Laporan', href: '/reports', icon: 'TrendingUp', requiredPermission: 'reports' },
      { id: 'ai-forecast', label: 'AI Forecasting', href: '/ai-forecast', icon: 'LineChart', requiredPermission: 'forecast' },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    items: [
      {
        id: 'settings',
        label: 'Pengaturan',
        icon: 'Settings',
        requiredPermission: 'settings',
        children: [
          { id: 'general', label: 'Konfigurasi Standar', href: '/settings' },
          { id: 'users', label: 'Manajemen Pengguna', href: '/settings/users' },
        ],
      },
      {
        id: 'audit-log',
        label: 'Audit Log & Sistem',
        href: '/settings/audit-log',
        icon: 'ClipboardList',
        requiredPermission: 'audit',
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
  const { isCollapsed, toggle } = useSidebar();
  const { user } = useAuth();

  // Filter navigation groups based on RBAC
  const filteredGroups = React.useMemo(() => {
    if (!user) return [];
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ROLE_PERMISSIONS } = require('@/types/auth');
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const isSuperAdmin = userPermissions.includes('*');

    return NAV_GROUPS.map((group) => {
      const filterItem = (item: typeof group.items[0]): typeof item | null => {
        if (!isSuperAdmin && item.requiredPermission && !userPermissions.includes(item.requiredPermission)) {
          return null;
        }
        if (item.children) {
          const filteredChildren = item.children.map(filterItem).filter(Boolean) as typeof item.children;
          return { ...item, children: filteredChildren };
        }
        return item;
      };

      const filteredItems = group.items.map(filterItem).filter(Boolean) as typeof group.items;
      return { ...group, items: filteredItems };
    }).filter((group) => group.items.length > 0);
  }, [user]);

  return (
    <>
      {/* Mobile backdrop */}
      {!isCollapsed && (
        <div
          className={cn(styles.backdrop, 'md-hidden')}
          aria-hidden="true"
          onClick={toggle}
        />
      )}
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
    </>
  );
}
