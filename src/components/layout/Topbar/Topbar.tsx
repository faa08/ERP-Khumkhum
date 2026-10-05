'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Avatar } from '@/components/ui/StatusBadge';
import { ROLE_LABELS } from '@/types/auth';
import { STORAGE_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getAppNotifications } from '@/actions/notifications';
import type { AppNotification } from '@/types/notification';
import {
  PanelLeft,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  User,
  Settings,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Scale,
  CheckCircle2,
  CheckCheck,
  ArrowRight,
  RefreshCw,
  Package,
} from 'lucide-react';
import styles from './Topbar.module.css';

const NOTIF_STORAGE_KEY = 'khumkhum_read_notifications';

function getRelativeTimeString(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Baru saja';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return 'Baru saja';
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  QC: 'Quality Control',
  PRODUCTION: 'Produksi',
  INVENTORY: 'Gudang & Stok',
  RECEIVING: 'Penerimaan',
  SALES: 'Penjualan',
  SYSTEM: 'Sistem',
};

export function Topbar() {
  const router = useRouter();
  const { toggle } = useSidebar();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(STORAGE_KEYS.THEME, 'light');

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readNotifIds, setReadNotifIds] = useLocalStorage<string[]>(NOTIF_STORAGE_KEY, []);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userMenuRef = useClickOutside<HTMLDivElement>(() => setIsUserMenuOpen(false));
  const notifMenuRef = useClickOutside<HTMLDivElement>(() => setIsNotifOpen(false));

  const loadNotifications = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await getAppNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Gagal memuat notifikasi:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 45000); // refresh halus setiap 45 detik
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  }, [notifications, readNotifIds]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'CRITICAL') {
      return notifications.filter((n) => n.severity === 'danger' || n.severity === 'warning');
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!readNotifIds.includes(notif.id)) {
      setReadNotifIds([...readNotifIds, notif.id]);
    }
    setIsNotifOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

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

        {/* Operational Notification Bell */}
        <div className={styles.notifMenu} ref={notifMenuRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            aria-expanded={isNotifOpen}
            aria-haspopup="true"
            aria-label={`Notifikasi operasional (${unreadCount} belum dibaca)`}
            className={cn(styles.iconBtn, styles.notifBellBtn)}
            title="Pemberitahuan & Peringatan Operasional Pabrik"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className={styles.notifBadge}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isNotifOpen && (
            <div className={styles.notifPopover} role="region" aria-label="Daftar notifikasi operasional">
              {/* Header */}
              <div className={styles.notifHeader}>
                <div className={styles.notifHeaderLeft}>
                  <h3 className={styles.notifHeaderTitle}>Pemberitahuan Pabrik</h3>
                  {unreadCount > 0 && (
                    <span className={styles.notifCountPill}>
                      {unreadCount} Baru
                    </span>
                  )}
                </div>
                <div className={styles.notifHeaderActions}>
                  <button
                    type="button"
                    onClick={loadNotifications}
                    className={styles.notifTextBtn}
                    aria-label="Perbarui data notifikasi"
                    title="Segarkan data notifikasi"
                  >
                    <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} aria-hidden="true" />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className={styles.notifTextBtn}
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                      Tandai dibaca
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className={styles.notifFilters}>
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={cn(styles.notifFilterBtn, activeFilter === 'ALL' && styles['notifFilterBtn--active'])}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('CRITICAL')}
                  className={cn(styles.notifFilterBtn, activeFilter === 'CRITICAL' && styles['notifFilterBtn--active'])}
                >
                  Mendesak ({notifications.filter((n) => n.severity === 'danger' || n.severity === 'warning').length})
                </button>
              </div>

              {/* Notification Items List */}
              <div className={styles.notifList}>
                {filteredNotifications.length === 0 ? (
                  <div className={styles.notifEmpty}>
                    <CheckCircle2 className={cn('w-8 h-8', styles.notifEmptyIcon)} aria-hidden="true" />
                    <p className={styles.notifEmptyTitle}>Semua Operasional Lancar</p>
                    <p className={styles.notifEmptyDesc}>
                      {activeFilter === 'CRITICAL'
                        ? 'Tidak ada peringatan kritis atau antrean yang mendesak saat ini.'
                        : 'Tidak ada notifikasi baru untuk peran Anda saat ini.'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => {
                    const isUnread = !readNotifIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNotificationClick(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNotificationClick(item);
                          }
                        }}
                        className={cn(styles.notifItem, isUnread && styles['notifItem--unread'])}
                      >
                        {/* Icon */}
                        <div className={cn(styles.notifIconWrap, styles[`notifIconWrap--${item.severity}`])}>
                          {item.category === 'QC' ? (
                            <ShieldAlert className="w-4 h-4 text-currentColor" aria-hidden="true" />
                          ) : item.category === 'PRODUCTION' ? (
                            <Flame className="w-4 h-4 text-currentColor" aria-hidden="true" />
                          ) : item.category === 'INVENTORY' ? (
                            <AlertTriangle className="w-4 h-4 text-currentColor" aria-hidden="true" />
                          ) : item.category === 'RECEIVING' ? (
                            <Scale className="w-4 h-4 text-currentColor" aria-hidden="true" />
                          ) : (
                            <Package className="w-4 h-4 text-currentColor" aria-hidden="true" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={styles.notifBody}>
                          <div className={styles.notifTopRow}>
                            <span className={styles.notifCategory}>
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <span className={styles.notifTime}>
                              {getRelativeTimeString(item.timestamp)}
                            </span>
                          </div>
                          <h4 className={styles.notifItemTitle}>{item.title}</h4>
                          <p className={styles.notifItemMessage}>{item.message}</p>
                          <div className={styles.notifActionRow}>
                            <span>Buka halaman</span>
                            <ArrowRight className="w-3 h-3 text-currentColor" aria-hidden="true" />
                          </div>
                        </div>

                        {/* Unread dot */}
                        {isUnread && <span className={styles.notifUnreadDot} aria-hidden="true" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

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
