'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useKeyboard } from '@/hooks/useKeyboard';
import styles from './Dropdown.module.css';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

export function Dropdown({ trigger, items, position = 'bottom-right', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  useKeyboard({ Escape: () => setIsOpen(false) }, isOpen);

  return (
    <div className={cn(styles.wrapper, className)} ref={dropdownRef}>
      <div 
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        {trigger}
      </div>

      {isOpen && (
        <div className={cn(styles.menu, styles[`menu--${position}`])} role="menu">
          {items.map((item, index) => {
            if (item.divider) {
              return <hr key={`divider-${index}`} className={styles.divider} />;
            }

            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  styles.item,
                  item.danger && styles['item--danger'],
                  item.disabled && styles['item--disabled']
                )}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                role="menuitem"
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
