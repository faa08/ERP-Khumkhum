'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import styles from './Combobox.module.css';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean | string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({ options, value, onChange, placeholder = 'Select option...', error, disabled, className }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const containerRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = options.filter((opt) => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearch('');
    }
  }, [isOpen]);

  return (
    <div className={cn(styles.wrapper, className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          styles.trigger,
          error && styles['trigger--error'],
          disabled && styles['trigger--disabled']
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={cn(styles.triggerText, !selectedOption && styles.placeholder)}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={styles.icon} />
      </button>

      {isOpen && (
        <div className={styles.popover}>
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className={styles.listbox} role="listbox">
            {filteredOptions.length === 0 ? (
              <li className={styles.empty}>No results found.</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={value === opt.value}
                  className={cn(styles.option, value === opt.value && styles['option--selected'])}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {value === opt.value && <Check size={14} className={styles.checkIcon} />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
