/**
 * KhumKhum ERP — Navigation Types
 */

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: string; // lucide icon name
  badge?: string | number;
  children?: NavItem[];
  requiredPermission?: string;
  dividerBefore?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}
