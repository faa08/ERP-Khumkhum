'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useKeyboard } from '@/hooks/useKeyboard';
import styles from './Popover.module.css';

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
  triggerClassName?: string;
}

export function Popover({ trigger, content, position = 'bottom-left', className, triggerClassName }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const popoverRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  useKeyboard({ Escape: () => setIsOpen(false) }, isOpen);

  return (
    <div className={cn(styles.wrapper, className)} ref={popoverRef}>
      <div 
        className={cn(styles.trigger, triggerClassName)} 
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
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
        <div 
          className={cn(styles.popover, styles[`popover--${position}`])}
          role="dialog"
        >
          {content}
        </div>
      )}
    </div>
  );
}
