import React from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'ghost' | 'danger' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-brand-dark shadow-[0_2px_8px_rgba(7,102,0,0.3)] active:scale-95',
  ghost:
    'px-4 py-2 rounded-lg text-[13px] font-medium text-gray-600 border border-line bg-white hover:bg-surface-muted hover:text-brand',
  danger:
    'px-4 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50',
  icon:
    'w-7 h-7 border border-line rounded-md flex items-center justify-center bg-white text-gray-500 hover:bg-surface-muted',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className,
  children,
  ...props
}) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 cursor-pointer outline-none transition-all',
      VARIANTS[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
