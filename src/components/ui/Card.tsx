import React from 'react';
import { cn } from '../../lib/utils';

/** Contêiner branco com borda e sombra suave — base de tabelas e painéis. */
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'bg-white border border-line rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

/** Estado vazio / carregando / erro padronizado dentro de um Card. */
export const StateMessage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="py-16 text-center text-[13px] text-gray-400 font-medium">
    {children}
  </div>
);
