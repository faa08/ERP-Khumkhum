'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
  const [actualPlacement, setActualPlacement] = useState<'bottom' | 'top'>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close when clicking outside both trigger and menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && 
          triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Close on scroll
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // true for capturing phase
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  useKeyboard({ Escape: () => setIsOpen(false) }, isOpen);

  // Update coords when open & auto-flip if space below is limited
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = Math.max(160, items.length * 40 + 16);
      
      const shouldFlipUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setActualPlacement(shouldFlipUp ? 'top' : 'bottom');

      setCoords({
        top: rect.bottom + 4,
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen, items.length]);

  const isTop = position.startsWith('top') || actualPlacement === 'top';
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    ...(isTop ? { bottom: coords.bottom } : { top: coords.top }),
    ...(position.includes('right') ? { right: coords.right } : { left: coords.left })
  };

  const menuContent = isOpen && (
    <div 
      className={styles.menu} 
      role="menu"
      style={menuStyle}
      ref={menuRef}
    >
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
  );

  return (
    <div className={cn(styles.wrapper, className)}>
      <div 
        className={styles.trigger}
        ref={triggerRef}
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

      {typeof document !== 'undefined' ? createPortal(menuContent, document.body) : null}
    </div>
  );
}
