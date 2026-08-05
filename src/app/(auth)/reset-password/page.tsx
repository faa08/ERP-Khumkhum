'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/form/FormField';
import styles from './reset-password.module.css';

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: 'placeholder-token' },
  });

  const onSubmit = async (_data: ResetPasswordFormData) => {
    setIsLoading(true);
    // TODO Phase 2: call real reset password API with token
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    setSuccess(true);
  };

  const ToggleBtn = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className={styles.toggleBtn}>
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.brandMark} aria-hidden="true">KK</div>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter your new password below.</p>
      </div>

      {success ? (
        <div className={styles.successState}>
          <CheckCircle2 size={40} className={styles.successIcon} />
          <p className={styles.successTitle}>Password reset successful</p>
          <p className={styles.successDesc}>You can now sign in with your new password.</p>
          <Link href={ROUTES.LOGIN}>
            <Button variant="primary" fullWidth>Back to Sign In</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
          <FormField label="New Password" required htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              autoFocus
              fullWidth
              error={errors.password?.message}
              rightElement={<ToggleBtn show={showPassword} onToggle={() => setShowPassword((p) => !p)} />}
              {...register('password')}
            />
          </FormField>
          <FormField label="Confirm Password" required htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              fullWidth
              error={errors.confirmPassword?.message}
              rightElement={<ToggleBtn show={showConfirm} onToggle={() => setShowConfirm((p) => !p)} />}
              {...register('confirmPassword')}
            />
          </FormField>
          <input type="hidden" {...register('token')} />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}

      {!success && (
        <Link href={ROUTES.LOGIN} className={styles.backLink}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      )}
    </div>
  );
}
