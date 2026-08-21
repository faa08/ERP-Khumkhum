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
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().optional(),
  role: z.string().min(1, 'Role wajib diisi'),
  whatsappNumber: z.string().max(20, 'Nomor terlalu panjang').optional().or(z.literal('')),
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
      username: '',
      password: '',
      role: '',
      whatsappNumber: '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          username: user.email, // Map existing email to username field
          password: '',
          role: user.role,
          whatsappNumber: user.whatsappNumber || '',
        });
      } else {
        reset({ username: '', password: '', role: '', whatsappNumber: '' });
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
      const submitData: Partial<User> = {
        email: data.username, // Map username back to email for DB compatibility
        name: data.username,  // Fallback name to username
        role: data.role as UserRole,
        whatsappNumber: data.whatsappNumber || undefined,
      };
      
      // Inject password for creation
      if (!isEditing && data.password) {
        (submitData as any).password = data.password;
      }
      
      await onSubmit(submitData);
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
        <FormField label="Username" required error={errors.username?.message}>
          <Input fullWidth {...register('username')} placeholder="Masukkan username" />
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
        
        <FormField label="No. WhatsApp (Opsional)" error={errors.whatsappNumber?.message}>
          <Input fullWidth {...register('whatsappNumber')} placeholder="Misal: 08123456789" />
        </FormField>
      </form>
    </Drawer>
  );
}
