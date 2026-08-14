'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Combobox } from '@/components/ui/Combobox';
import { FormField } from '@/components/form/FormField';
import { ROLE_LABELS, type UserRole, type User } from '@/types/auth';

const userSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  department: z.string().min(1, 'Department is required'),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSubmit: (data: Partial<User>) => Promise<void>;
}

export function UserFormDrawer({ isOpen, onClose, user, onSubmit }: UserFormDrawerProps) {
  const isEditing = !!user;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      password: '',
      role: '',
      department: '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          password: '',
          role: user.role,
          department: user.department,
        });
      } else {
        reset({ employeeId: '', name: '', email: '', password: '', role: '', department: '' });
      }
    }
  }, [isOpen, user, reset]);

  const roleValue = watch('role');
  
  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label
  }));

  const handleFormSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data as Partial<User>);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Pengguna' : 'Buat Pengguna Baru'}
      description={isEditing ? 'Perbarui informasi dan hak akses pengguna.' : 'Tambahkan pengguna baru ke sistem ERP.'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Batal</Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} loading={isSubmitting}>
            {isEditing ? 'Simpan Perubahan' : 'Buat Pengguna'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <FormField label="ID Karyawan" required error={errors.employeeId?.message}>
          <Input fullWidth {...register('employeeId')} placeholder="misal: EMP-001" disabled={isEditing} />
        </FormField>
        
        <FormField label="Nama Lengkap" required error={errors.name?.message}>
          <Input fullWidth {...register('name')} placeholder="Masukkan nama lengkap" />
        </FormField>
        
        <FormField label="Alamat Email" required error={errors.email?.message}>
          <Input fullWidth type="email" {...register('email')} placeholder="email@khumkhum.id" />
        </FormField>
        
        {!isEditing && (
          <FormField label="Kata Sandi" error={errors.password?.message}>
            <Input fullWidth type="text" {...register('password')} placeholder="Kosongkan untuk default 'password123'" />
          </FormField>
        )}
        
        <FormField label="Peran (Role)" required error={errors.role?.message}>
          <Combobox
            options={roleOptions}
            value={roleValue}
            onChange={(val) => setValue('role', val, { shouldValidate: true })}
            placeholder="Pilih peran..."
          />
        </FormField>

        <FormField label="Departemen" required error={errors.department?.message}>
          <Input fullWidth {...register('department')} placeholder="misal: Produksi" />
        </FormField>
      </form>
    </Drawer>
  );
}
