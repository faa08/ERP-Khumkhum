'use client';

import React, { useState, useRef } from 'react';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Avatar } from '@/components/ui/StatusBadge';
import { ROLE_LABELS } from '@/types/auth';
import { STORAGE_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  PanelLeft,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import styles from './Topbar.module.css';

export function Topbar() {
  const { toggle } = useSidebar();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(STORAGE_KEYS.THEME, 'light');

  const userMenuRef = useClickOutside<HTMLDivElement>(() => setIsUserMenuOpen(false));

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className={styles.topbar} role="banner">
      {/* Left: Sidebar toggle */}
      <div className={styles.left}>
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle sidebar"
          className={styles.iconBtn}
        >
          <PanelLeft size={18} />
        </button>
      </div>



      {/* Right: Notifications + Theme + User */}
      <div className={styles.right}>
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className={styles.iconBtn}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Notification bell — placeholder */}
        <button
          type="button"
          aria-label="Notifikasi (belum tersedia)"
          className={styles.iconBtn}
          disabled
          title="Notifikasi — segera hadir"
        >
          <Bell size={16} />
        </button>

        {/* User menu */}
        <div className={styles.userMenu} ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((p) => !p)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label="User menu"
            className={styles.userBtn}
          >
            <Avatar name={user?.name ?? 'User'} size="sm" />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name ?? 'User'}</span>
              <span className={styles.userRole}>
                {user ? ROLE_LABELS[user.role] : 'Tamu'}
              </span>
            </div>
            <ChevronDown size={12} className={cn(styles.userChevron, isUserMenuOpen && styles['userChevron--open'])} />
          </button>

          {isUserMenuOpen && (
            <div className={styles.dropdown} role="menu" aria-label="User options">
              <div className={styles.dropdownHeader}>
                <p className={styles.dropdownName}>{user?.name}</p>
                <p className={styles.dropdownEmail}>{user?.email}</p>
              </div>
              <hr className={styles.dropdownDivider} />
              <button type="button" role="menuitem" className={styles.dropdownItem} onClick={() => setIsUserMenuOpen(false)}>
                <User size={14} /> Profil
              </button>
              <button type="button" role="menuitem" className={styles.dropdownItem} onClick={() => setIsUserMenuOpen(false)}>
                <Settings size={14} /> Pengaturan
              </button>
              <hr className={styles.dropdownDivider} />
              <button type="button" role="menuitem" className={cn(styles.dropdownItem, styles['dropdownItem--danger'])} onClick={logout}>
                <LogOut size={14} /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
