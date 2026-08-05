'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Send } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations';
import { ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/form/FormField';
import styles from './forgot-password.module.css';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (_data: ForgotPasswordFormData) => {
    setIsLoading(true);
    // TODO Phase 2: call real forgot password API
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.brandMark} aria-hidden="true">KK</div>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>
          Enter your email address and we will send you a reset link.
        </p>
      </div>

      {submitted ? (
        <Alert variant="success" title="Reset link sent">
          If an account exists with that email, you will receive a password reset link shortly.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
          <FormField label="Email Address" required htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="your.email@khumkhum.id"
              autoComplete="email"
              autoFocus
              fullWidth
              error={errors.email?.message}
              {...register('email')}
            />
          </FormField>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} leftIcon={!isLoading ? <Send size={15} /> : undefined}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      )}

      <Link href={ROUTES.LOGIN} className={styles.backLink}>
        <ArrowLeft size={14} />
        Back to sign in
      </Link>
    </div>
  );
}
