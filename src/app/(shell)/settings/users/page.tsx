'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { Plus, MoreVertical, Edit2, Key, Ban, CheckCircle, Eye } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { ROLE_LABELS, type User } from '@/types/auth';
import { UserFormDrawer } from './UserFormDrawer';
import { UserDetailModal } from './UserDetailModal';

// MOCK DATA
const MOCK_USERS: User[] = [
  { id: '1', employeeId: 'EMP-001', name: 'Super Admin', email: 'admin@khumkhum.id', role: 'super_admin', department: 'IT', isActive: true, lastLogin: '2026-08-05T08:00:00Z' },
  { id: '2', employeeId: 'EMP-002', name: 'Budi Operasional', email: 'budi@khumkhum.id', role: 'admin_operasional', department: 'Operations', isActive: true, lastLogin: '2026-08-04T10:30:00Z' },
  { id: '3', employeeId: 'EMP-003', name: 'Siti Produksi', email: 'siti@khumkhum.id', role: 'petugas_produksi', department: 'Production', isActive: false },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
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
    variant: 'primary'
  });

  const toast = useToast();

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
    // Simulated API call
    await new Promise(r => setTimeout(r, 800));
    
    if (selectedUser) {
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...data } as User : u));
      toast.success('User updated');
    } else {
      const newUser: User = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        isActive: true,
      } as User;
      setUsers([...users, newUser]);
      toast.success('User created');
    }
  };

  const handleToggleStatus = (user: User) => {
    const isActivating = !user.isActive;
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Reactivate User' : 'Deactivate User',
      description: `Are you sure you want to ${isActivating ? 'reactivate' : 'deactivate'} ${user.name}?`,
      variant: isActivating ? 'primary' : 'danger',
      onConfirm: async () => {
        setUsers(users.map(u => u.id === user.id ? { ...u, isActive: isActivating } : u));
        toast.success(`User ${isActivating ? 'reactivated' : 'deactivated'}`);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetPassword = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Password',
      description: `Are you sure you want to reset the password for ${user.name}? A temporary password will be generated.`,
      variant: 'danger',
      onConfirm: async () => {
        toast.success('Password reset successful');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<User>[]>(() => [
    { accessorKey: 'employeeId', header: 'Emp ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { 
      accessorKey: 'role', 
      header: 'Role',
      cell: ({ row }) => ROLE_LABELS[row.original.role] 
    },
    { accessorKey: 'department', header: 'Department' },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} label={row.original.isActive ? 'Active' : 'Inactive'} />
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm" style={{ padding: '0 8px' }}>
                <MoreVertical size={16} />
              </Button>
            }
            items={[
              { id: 'view', label: 'View Details', icon: <Eye size={14} />, onClick: () => handleView(user) },
              { id: 'edit', label: 'Edit User', icon: <Edit2 size={14} />, onClick: () => handleEdit(user) },
              { id: 'reset', label: 'Reset Password', icon: <Key size={14} />, onClick: () => handleResetPassword(user) },
              { divider: true, id: 'div1', label: '' },
              { 
                id: 'toggle-status', 
                label: user.isActive ? 'Deactivate' : 'Reactivate', 
                icon: user.isActive ? <Ban size={14} /> : <CheckCircle size={14} />,
                danger: user.isActive,
                onClick: () => handleToggleStatus(user)
              },
            ]}
          />
        );
      }
    }
  ], [users]);

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and access permissions."
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'Users' }
        ]}
        actions={
          <Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>
            Create User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        
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
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
