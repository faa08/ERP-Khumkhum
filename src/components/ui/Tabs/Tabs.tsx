'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
  onChange?: (tabId: string) => void;
}

/**
 * Horizontal tab navigation.
 * Used to segment related content within a page (e.g., Details / History / Documents).
 */
export function Tabs({ tabs, defaultTab, className, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={cn(styles.wrapper, className)}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            disabled={tab.disabled}
            className={cn(styles.tab, activeTab === tab.id && styles['tab--active'], tab.disabled && styles['tab--disabled'])}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={styles.badge}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className={styles.panel}
      >
        {activeContent}
      </div>
    </div>
  );
}
