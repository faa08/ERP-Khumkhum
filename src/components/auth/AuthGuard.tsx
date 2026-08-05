'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_PERMISSIONS } from '@/types/auth';
import { ROUTES } from '@/lib/constants';

import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldAlert } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

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
  if (isLoading || isAuthorized === null) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <span>Loading...</span>
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
