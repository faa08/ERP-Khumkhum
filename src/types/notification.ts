export type NotificationCategory = 'QC' | 'PRODUCTION' | 'INVENTORY' | 'RECEIVING' | 'SALES' | 'SYSTEM';
export type NotificationSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  link: string;
  timestamp: string; // ISO String
  isActionable?: boolean;
}
