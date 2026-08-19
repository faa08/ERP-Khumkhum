'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { ROUTES } from '@/lib/constants';
import { Alert } from '@/components/ui/Alert';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
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
      {/* Brand Header */}
      <div className={styles.header}>
        <div className={styles.logoRow}>
          <img
            src="/Khumkhum-01-1536x486.webp"
            alt="KhumKhum Jamur Crispy"
            className={styles.brandLogo}
          />
          <span className={styles.erpBadge}>ERP SYSTEM</span>
        </div>
        <h1 className={styles.title}>Selamat Datang!</h1>
        <p className={styles.subtitle}>
          Masuk ke portal operasional & manajemen KhumKhum
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" title={error} dismissible onDismiss={clearError} />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
        {/* Email / Username Input */}
        <div className={styles.inputGroup}>
          <label htmlFor="username" className={styles.label}>
            Email atau Username <span style={{ color: '#D31F26' }}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <Mail size={17} className={styles.inputIcon} />
            <input
              id="username"
              type="text"
              placeholder="Masukkan email atau username"
              autoComplete="username"
              autoFocus
              className={`${styles.inputField} ${errors.username ? styles.inputError : ''}`}
              {...register('username')}
            />
          </div>
          {errors.username && (
            <span className={styles.errorText}>{errors.username.message}</span>
          )}
        </div>

        {/* Password Input */}
        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Kata Sandi <span style={{ color: '#D31F26' }}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <Lock size={17} className={styles.inputIcon} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan kata sandi Anda"
              autoComplete="current-password"
              className={`${styles.inputField} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className={styles.showPasswordBtn}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <span className={styles.errorText}>{errors.password.message}</span>
          )}
        </div>

        {/* Remember me & Forgot Password */}
        <div className={styles.row}>
          <label htmlFor="rememberMe" className={styles.rememberWrap}>
            <input
              id="rememberMe"
              type="checkbox"
              className={styles.checkbox}
              {...register('rememberMe')}
            />
            <span>Ingat saya</span>
          </label>
          <Link href={ROUTES.FORGOT_PASSWORD} className={styles.forgotLink}>
            Lupa kata sandi?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={styles.submitBtn}
        >
          {isLoading ? (
            <span>Sedang Masuk...</span>
          ) : (
            <>
              <LogIn size={18} />
              <span>Masuk ke Akun</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
