import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  value: string | number;
  label: string;
}

interface FilterSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  /** Ícone opcional à esquerda (ex: Filter, Building2). */
  icon?: LucideIcon;
  /** Texto exibido quando o valor está "vazio". */
  placeholder?: string;
  className?: string;
}

/**
 * Select de barra de filtros padronizado.
 *
 * Resolve a inconsistência anterior em que alguns filtros tinham borda externa
 * e outros não: todos compartilham o mesmo contêiner aqui.
 */
export const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder,
  className,
}) => {
  const isEmpty = value === '' || value === undefined;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 h-[42px] bg-white rounded-full border border-line text-[13px] hover:border-gray-300 transition-colors shadow-sm min-w-35',
        className,
      )}
    >
      {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-full bg-transparent border-none shadow-none outline-none text-[13px] font-medium cursor-pointer appearance-none focus:ring-0',
          isEmpty ? 'text-gray-400' : 'text-gray-900',
        )}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-gray-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};
