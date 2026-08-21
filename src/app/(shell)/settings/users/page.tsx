'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { Plus, MoreVertical, Edit2, Key, Ban, CheckCircle, Eye, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { ROLE_LABELS, type User, type UserRole } from '@/types/auth';
import type { UserRole as DbUserRole } from '@/types/database';
import { UserFormDrawer } from './UserFormDrawer';
import { UserDetailModal } from './UserDetailModal';
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  toggleUserStatusAction,
  resetUserPasswordAction,
  deleteUserAction,
} from '@/actions/admin';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'primary',
  });

  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsersAction();
      if (res.success && res.data) {
        const mappedUsers: User[] = res.data.map((u) => ({
          id: u.id,
          employeeId: u.id.slice(0, 8).toUpperCase(),
          name: u.name,
          email: u.email,
          role: u.role as UserRole,
          whatsappNumber: u.whatsapp_number || undefined,
          department: u.role.toLowerCase().includes('produksi')
            ? 'Produksi'
            : u.role.toLowerCase().includes('gudang')
            ? 'Warehouse & PPIC'
            : u.role.toLowerCase().includes('qc')
            ? 'Quality Control'
            : 'Management',
          isActive: u.is_active,
          lastLogin: u.updated_at,
        }));
        setUsers(mappedUsers);
      } else {
        toast.error(res.error || 'Gagal memuat data pengguna');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data pengguna');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = () => {
    setSelectedUser(null);
    setDrawerOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setDetailModalOpen(true);
  };

  const handleFormSubmit = async (data: Partial<User>) => {
    if (selectedUser) {
      const res = await updateUserAction(selectedUser.id, {
        name: data.name,
        email: data.email,
        role: data.role as DbUserRole,
        whatsapp_number: data.whatsappNumber,
      });

      if (res.success) {
        toast.success('Pengguna berhasil diperbarui');
        fetchUsers();
      } else {
        toast.error(res.error || 'Gagal memperbarui pengguna');
      }
    } else {
      // @ts-ignore - password is not in User type but we pass it from the form
      const password = (data as any).password || 'password123';
      
      const res = await createUserAction({
        name: data.name || '',
        email: data.email || '',
        role: (data.role as DbUserRole) || 'QC',
        whatsapp_number: data.whatsappNumber,
        password: password,
      });

      if (res.success) {
        toast.success(`Pengguna berhasil dibuat (Password: ${password})`);
        fetchUsers();
      } else {
        toast.error(res.error || 'Gagal membuat pengguna');
      }
    }
  };

  const handleToggleStatus = (user: User) => {
    const isActivating = !user.isActive;
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Aktifkan Pengguna' : 'Nonaktifkan Pengguna',
      description: `Apakah Anda yakin ingin ${isActivating ? 'mengaktifkan' : 'menonaktifkan'} akses untuk ${user.name}?`,
      variant: isActivating ? 'primary' : 'danger',
      onConfirm: async () => {
        const res = await toggleUserStatusAction(user.id, isActivating);
        if (res.success) {
          toast.success(`Pengguna berhasil ${isActivating ? 'diaktifkan' : 'dinonaktifkan'}`);
          fetchUsers();
        } else {
          toast.error(res.error || 'Gagal mengubah status pengguna');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleResetPassword = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Kata Sandi',
      description: `Apakah Anda yakin ingin mereset kata sandi untuk ${user.name}? Kata sandi akan diatur ulang menjadi "password123".`,
      variant: 'danger',
      onConfirm: async () => {
        const res = await resetUserPasswordAction(user.id, 'password123');
        if (res.success) {
          toast.success(`Kata sandi untuk ${user.name} direset menjadi "password123"`);
        } else {
          toast.error(res.error || 'Gagal mereset kata sandi');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteUser = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Pengguna',
      description: `Apakah Anda yakin ingin menghapus akun ${user.name}? Tindakan ini tidak dapat dibatalkan.`,
      variant: 'danger',
      onConfirm: async () => {
        const res = await deleteUserAction(user.id);
        if (res.success) {
          toast.success('Pengguna berhasil dihapus');
          fetchUsers();
        } else {
          toast.error(res.error || 'Gagal menghapus pengguna');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Pengguna',
        cell: ({ row }) => (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
              {row.original.name}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.original.email}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Peran / Hak Akses',
        cell: ({ row }) => (
          <span style={{ fontSize: 'var(--text-sm)' }}>
            {ROLE_LABELS[row.original.role] || row.original.role}
          </span>
        ),
      },
      {
        accessorKey: 'whatsappNumber',
        header: 'No. WhatsApp',
        cell: ({ row }) => (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {row.original.whatsappNumber || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Departemen',
        cell: ({ row }) => (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {row.original.department}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? 'active' : 'inactive'}
            label={row.original.isActive ? 'Aktif' : 'Nonaktif'}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const user = row.original;
          const dropdownItems: DropdownItem[] = [
            {
              id: 'view',
              label: 'Lihat Detail',
              icon: <Eye size={14} />,
              onClick: () => handleView(user),
            },
            {
              id: 'edit',
              label: 'Edit Pengguna',
              icon: <Edit2 size={14} />,
              onClick: () => handleEdit(user),
            },
            {
              id: 'reset-pwd',
              label: 'Reset Kata Sandi',
              icon: <Key size={14} />,
              onClick: () => handleResetPassword(user),
            },
            {
              id: 'toggle-status',
              label: user.isActive ? 'Nonaktifkan' : 'Aktifkan',
              icon: user.isActive ? <Ban size={14} /> : <CheckCircle size={14} />,
              danger: user.isActive,
              onClick: () => handleToggleStatus(user),
            },
            {
              id: 'delete',
              label: 'Hapus Pengguna',
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => handleDeleteUser(user),
            },
          ];

          return (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm" aria-label="Actions">
                    <MoreVertical size={16} />
                  </Button>
                }
                items={dropdownItems}
              />
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun staf, role pengguna, dan kontrol hak akses sistem ERP."
        breadcrumbs={[
          { label: 'Pengaturan', href: '/settings' },
          { label: 'Pengguna' },
        ]}
        actions={
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleCreate}>
            Tambah Pengguna
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={loading}
      />

      <UserFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={selectedUser}
        onSubmit={handleFormSubmit}
      />

      <UserDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        user={selectedUser}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
