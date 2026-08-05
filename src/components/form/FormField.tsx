import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Form.module.css';

// ─────────────────────────────────────────────
// FORM LABEL
// ─────────────────────────────────────────────

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
}

export function FormLabel({ required, optional, children, className, ...props }: FormLabelProps) {
  return (
    <label className={cn(styles.label, className)} {...props}>
      {children}
      {required && <span className={styles.requiredMark} aria-label="required"> *</span>}
      {optional && !required && <span className={styles.optionalMark}> (optional)</span>}
    </label>
  );
}

// ─────────────────────────────────────────────
// FORM MESSAGE
// ─────────────────────────────────────────────

export interface FormMessageProps {
  type?: 'error' | 'helper' | 'success';
  children: React.ReactNode;
  id?: string;
}

export function FormMessage({ type = 'helper', children, id }: FormMessageProps) {
  return (
    <p
      id={id}
      className={cn(styles.message, styles[`message--${type}`])}
      role={type === 'error' ? 'alert' : undefined}
    >
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────
// FORM FIELD
// ─────────────────────────────────────────────

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  helperText?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, optional, error, helperText, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <FormLabel htmlFor={htmlFor} required={required} optional={optional}>
          {label}
        </FormLabel>
      )}
      {children}
      {error && <FormMessage type="error">{error}</FormMessage>}
      {helperText && !error && <FormMessage type="helper">{helperText}</FormMessage>}
    </div>
  );
}

// ─────────────────────────────────────────────
// FORM SECTION
// Groups related form fields with a title.
// ─────────────────────────────────────────────

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormSection({ title, description, children, columns = 1, className }: FormSectionProps) {
  return (
    <fieldset className={cn(styles.section, className)}>
      {(title || description) && (
        <div className={styles.sectionHeader}>
          {title && <legend className={styles.sectionTitle}>{title}</legend>}
          {description && <p className={styles.sectionDescription}>{description}</p>}
        </div>
      )}
      <div className={cn(styles.sectionBody, styles[`grid--${columns}`])}>
        {children}
      </div>
    </fieldset>
  );
}

// ─────────────────────────────────────────────
// FORM ACTIONS
// Consistent footer for form buttons.
// ─────────────────────────────────────────────

export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
