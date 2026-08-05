'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROLE_LABELS, type User } from '@/types/auth';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      description="Detailed information about this user."
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-2)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Employee ID</span>
          <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{user.employeeId}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Name</span>
          <span>{user.name}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Email</span>
          <span>{user.email}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Department</span>
          <span>{user.department}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Role</span>
          <span>{ROLE_LABELS[user.role]}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Status</span>
          <div>
            <StatusBadge status={user.isActive ? 'active' : 'inactive'} label={user.isActive ? 'Active' : 'Inactive'} />
          </div>
          
          {user.lastLogin && (
            <>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Last Login</span>
              <span>{new Date(user.lastLogin).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
