'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_PERMISSIONS } from '@/types/auth';
import { ROUTES } from '@/lib/constants';

import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldAlert } from 'lucide-react';
import { getSettingAction } from '@/actions/settings';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState<{ isActive: boolean; message: string } | null>(null);

  // Fetch Maintenance Mode status
  useEffect(() => {
    async function checkMaintenance() {
      const res = await getSettingAction('maintenance_mode');
      if (res.success && res.value) {
        setMaintenanceMode({
          isActive: !!res.value.isActive,
          message: res.value.message || 'Sistem sedang dalam pemeliharaan (maintenance) rutin.'
        });
      } else {
        setMaintenanceMode({ isActive: false, message: '' });
      }
    }
    checkMaintenance();
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        // Not logged in -> redirect to login
        router.push(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(pathname)}`);
      } else {
        // Logged in -> check permissions
        if (requiredPermission) {
          const userPermissions = ROLE_PERMISSIONS[user.role] || [];
          const hasAccess = userPermissions.includes('*') || userPermissions.includes(requiredPermission);
          setIsAuthorized(hasAccess);
        } else {
          setIsAuthorized(true);
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, pathname, requiredPermission]);

  // Loading state
  if (isLoading || isAuthorized === null || maintenanceMode === null) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <span>Loading...</span>
      </div>
    );
  }

  // Check Maintenance Mode
  if (maintenanceMode.isActive && user?.role !== 'IT_MAINTENANCE') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <EmptyState
          icon={<ShieldAlert size={64} style={{ color: 'var(--color-warning-600)' }} />}
          title="Sedang Maintenance"
          description={maintenanceMode.message}
          action={{ label: "Kembali ke Login", onClick: () => router.push(ROUTES.LOGIN) }}
        />
      </div>
    );
  }

  // Not authorized state
  if (!isAuthorized) {
    return (
      <EmptyState
        icon={<ShieldAlert size={40} />}
        title="Access Denied"
        description="You do not have permission to view this page."
        action={{ label: "Go to Dashboard", onClick: () => router.push(ROUTES.DASHBOARD) }}
        
      />
    );
  }

  // Authorized
  return <>{children}</>;
}
