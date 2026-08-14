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
      title="Detail Pengguna"
      description="Informasi detail mengenai pengguna ini."
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>Tutup</Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-2)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>ID Karyawan</span>
          <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{user.employeeId}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Nama Lengkap</span>
          <span>{user.name}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Email</span>
          <span>{user.email}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Departemen</span>
          <span>{user.department}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Peran (Role)</span>
          <span>{ROLE_LABELS[user.role]}</span>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Status</span>
          <div>
            <StatusBadge status={user.isActive ? 'active' : 'inactive'} label={user.isActive ? 'Aktif' : 'Non-Aktif'} />
          </div>
          
          {user.lastLogin && (
            <>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Login Terakhir</span>
              <span>{new Date(user.lastLogin).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
