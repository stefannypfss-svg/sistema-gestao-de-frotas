import React from 'react';
import { cn } from '../../lib/utils';

/** Rótulo padrão dos formulários: uppercase, tracking largo. */
export const FieldLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  className,
  children,
  ...props
}) => (
  <label
    className={cn(
      'text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1',
      className,
    )}
    {...props}
  >
    {children}
  </label>
);

const FIELD_BASE =
  'w-full px-4 py-3 bg-surface-subtle rounded-full border-none outline-none font-semibold focus:ring-4 focus:ring-brand/5 transition-all';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input: React.FC<InputProps> = ({ className, invalid, ...props }) => (
  <input
    className={cn(FIELD_BASE, invalid && 'ring-2 ring-red-400', className)}
    {...props}
  />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  className,
  invalid,
  children,
  ...props
}) => (
  <select
    className={cn(FIELD_BASE, 'appearance-none', invalid && 'ring-2 ring-red-400', className)}
    {...props}
  >
    {children}
  </select>
);

export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className, ...props }) => (
  <textarea
    className={cn(FIELD_BASE, 'rounded-2xl resize-none', className)}
    {...props}
  />
);

interface FormFieldProps {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Agrupa rótulo + controle + mensagem de erro com espaçamento consistente. */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  className,
  children,
}) => (
  <div className={cn('space-y-1.5', className)}>
    <FieldLabel>{label}</FieldLabel>
    {children}
    {error && <p className="text-[10px] font-semibold text-red-500 ml-1">{error}</p>}
  </div>
);
