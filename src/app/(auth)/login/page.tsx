'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/form/FormField';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    const success = await login(data);
    if (success) {
      router.push(ROUTES.DASHBOARD);
    }
  };

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.brandMark} aria-hidden="true">KK</div>
        <h1 className={styles.title}>KhumKhum ERP</h1>
        <p className={styles.subtitle}>Masuk ke akun Anda untuk melanjutkan</p>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="danger" title={error} dismissible onDismiss={clearError} />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
        <FormField
          label="Email"
          required
          htmlFor="username"
          error={errors.username?.message}
        >
          <Input
            id="username"
            type="text"
            placeholder="Masukkan alamat email Anda"
            autoComplete="username"
            autoFocus
            fullWidth
            error={errors.username?.message}
            {...register('username')}
          />
        </FormField>

        <FormField
          label="Kata Sandi"
          required
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Masukkan kata sandi Anda"
            autoComplete="current-password"
            fullWidth
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className={styles.showPasswordBtn}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
            {...register('password')}
          />
        </FormField>

        <div className={styles.row}>
          <Checkbox
            id="rememberMe"
            label="Ingat saya"
            {...register('rememberMe')}
          />
          <Link href={ROUTES.FORGOT_PASSWORD} className={styles.forgotLink}>
            Lupa kata sandi?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          leftIcon={!isLoading ? <LogIn size={16} /> : undefined}
        >
          {isLoading ? 'Sedang masuk...' : 'Masuk'}
        </Button>
      </form>

      {/* Footer note */}
      <p className={styles.footerNote}>
        Untuk akses akun, silakan hubungi administrator sistem Anda.
      </p>

      {/* Dev hint */}
      <p className={styles.devHint}>
        Dev: superadmin@khumkhum.id / password123
      </p>
    </div>
  );
}
