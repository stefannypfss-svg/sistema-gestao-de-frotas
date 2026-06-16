import React from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Cor de destaque: classe de texto (ex: 'text-brand') e a borda lateral. */
  accentText: string;
  accentBorder: string;
  /** Conteúdo secundário no rodapé do card (badge, descrição). */
  footer?: React.ReactNode;
}

/** Card de indicador usado nas barras de estatísticas das views. */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  accentText,
  accentBorder,
  footer,
}) => (
  <div
    className={cn(
      'bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]',
      accentBorder,
    )}
  >
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-gray-500 mb-1">
        {label}
      </p>
      <p className={cn('text-[28px] font-bold leading-none', accentText)}>{value}</p>
    </div>
    {footer && <div className="text-[12px] text-gray-500 font-medium">{footer}</div>}
  </div>
);
