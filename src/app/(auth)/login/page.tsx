'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, Mail, Lock, Shield, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { ROUTES } from '@/lib/constants';
import { Alert } from '@/components/ui/Alert';
import styles from './login.module.css';

const PRESET_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@khumkhum.id', role: 'SUPER_ADMIN', icon: '👑' },
  { label: 'Gudang', email: 'warehouse@khumkhum.com', role: 'WAREHOUSE', icon: '🏢' },
  { label: 'Produksi', email: 'produksi@khumkhum.com', role: 'PRODUCTION', icon: '🔥' },
  { label: 'QC & Mutu', email: 'qc@khumkhum.com', role: 'QC', icon: '🔬' },
  { label: 'Direksi', email: 'management@khumkhum.com', role: 'MANAGEMENT', icon: '📊' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  const handleSelectPreset = (email: string) => {
    setActivePreset(email);
    setValue('username', email, { shouldValidate: true });
    setValue('password', 'password123', { shouldValidate: true });
    clearError();
  };

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
        <h1 className={styles.title}>Selamat Datang</h1>
        <p className={styles.subtitle}>
          Masuk ke portal terintegrasi rantai pasok, produksi, & kendali mutu
        </p>
      </div>

      {/* Quick Role Selector for Testing */}
      <div className={styles.quickLoginWrap}>
        <div className={styles.quickLoginHeader}>
          <span>Pilih Akun Demo / Role Cepat:</span>
          <Sparkles size={12} color="#FBBF24" />
        </div>
        <div className={styles.quickChips}>
          {PRESET_ACCOUNTS.map((item) => {
            const isSelected = activePreset === item.email;
            return (
              <button
                key={item.email}
                type="button"
                className={`${styles.quickChip} ${isSelected ? styles.quickChipActive : ''}`}
                onClick={() => handleSelectPreset(item.email)}
                title={`Login cepat sebagai ${item.label} (${item.email})`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
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
            Alamat Email / Username <span style={{ color: '#E52E2E' }}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <Mail size={16} className={styles.inputIcon} />
            <input
              id="username"
              type="text"
              placeholder="nama@khumkhum.com"
              autoComplete="username"
              autoFocus
              className={`${styles.inputField} ${errors.username ? styles.inputError : ''}`}
              {...register('username', {
                onChange: () => setActivePreset(null),
              })}
            />
          </div>
          {errors.username && (
            <span className={styles.errorText}>{errors.username.message}</span>
          )}
        </div>

        {/* Password Input */}
        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Kata Sandi <span style={{ color: '#E52E2E' }}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <Lock size={16} className={styles.inputIcon} />
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
            <span>Ingat sesi saya</span>
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
            <span>Memverifikasi Akun...</span>
          ) : (
            <>
              <LogIn size={18} />
              <span>Masuk ke Dashboard</span>
            </>
          )}
        </button>
      </form>

      {/* Security Footer Note */}
      <div className={styles.footerSec}>
        <Shield size={14} className={styles.secIcon} />
        <span>Enkripsi Sesi Aman & Proteksi Hak Akses Berbasis Peran (RBAC)</span>
      </div>
    </div>
  );
}
