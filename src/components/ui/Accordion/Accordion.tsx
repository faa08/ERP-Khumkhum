'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import styles from './Accordion.module.css';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  defaultExpanded?: string[];
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({ items, defaultExpanded = [], allowMultiple = false, className }: AccordionProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultExpanded));

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn(styles.accordion, className)}>
      {items.map((item) => {
        const isExpanded = expandedIds.has(item.id);
        return (
          <div key={item.id} className={styles.item}>
            <button
              type="button"
              className={cn(styles.header, isExpanded && styles['header--expanded'])}
              onClick={() => toggleItem(item.id)}
              aria-expanded={isExpanded}
              aria-controls={`accordion-content-${item.id}`}
              id={`accordion-header-${item.id}`}
            >
              <span className={styles.title}>{item.title}</span>
              <ChevronDown
                size={16}
                className={cn(styles.icon, isExpanded && styles['icon--expanded'])}
                aria-hidden="true"
              />
            </button>
            <div
              id={`accordion-content-${item.id}`}
              role="region"
              aria-labelledby={`accordion-header-${item.id}`}
              className={cn(styles.contentWrapper, isExpanded && styles['contentWrapper--expanded'])}
            >
              <div className={styles.content}>{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
