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
          role: user.role,
          department: user.department,
        });
      } else {
        reset({ employeeId: '', name: '', email: '', role: '', department: '' });
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
      title={isEditing ? 'Edit User' : 'Create New User'}
      description={isEditing ? 'Update user information and access level.' : 'Add a new user to the ERP system.'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(handleFormSubmit)} loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <FormField label="Employee ID" required error={errors.employeeId?.message}>
          <Input fullWidth {...register('employeeId')} placeholder="e.g. EMP-001" disabled={isEditing} />
        </FormField>
        
        <FormField label="Full Name" required error={errors.name?.message}>
          <Input fullWidth {...register('name')} placeholder="Enter full name" />
        </FormField>
        
        <FormField label="Email Address" required error={errors.email?.message}>
          <Input fullWidth type="email" {...register('email')} placeholder="email@khumkhum.id" />
        </FormField>
        
        <FormField label="Role" required error={errors.role?.message}>
          <Combobox
            options={roleOptions}
            value={roleValue}
            onChange={(val) => setValue('role', val, { shouldValidate: true })}
            placeholder="Select a role..."
          />
        </FormField>

        <FormField label="Department" required error={errors.department?.message}>
          <Input fullWidth {...register('department')} placeholder="e.g. Production" />
        </FormField>
      </form>
    </Drawer>
  );
}
