import React, { useEffect, useRef, useState } from 'react';
import { LucideIcon, ChevronDown, Check } from 'lucide-react';
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
 * Select de barra de filtros padronizado — botão + popover customizado
 * (mesma caixa/estilo do `MultiSelectPicker`), não um `<select>` nativo: a
 * lista nativa é desenhada pelo navegador/SO e não dá pra estilizar, então
 * pra abertura ter a mesma cara do resto do sistema o dropdown precisa ser
 * nosso. Seleção única — escolher uma opção já fecha o popover.
 */
export const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isEmpty = value === '' || value === undefined;
  const selectedLabel = options.find((o) => String(o.value) === String(value))?.label;

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div className={cn('relative inline-block', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 h-[38px] w-full min-w-[150px] max-w-[240px] bg-white rounded-lg border border-gray-200 text-[13px] hover:border-gray-300 transition-colors"
      >
        {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
        <span className={cn('flex-1 text-left truncate', isEmpty ? 'text-gray-400' : 'text-gray-900 font-medium')}>
          {isEmpty ? placeholder : selectedLabel}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 w-[240px] max-h-[320px] overflow-y-auto">
          {placeholder !== undefined && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[12px] rounded-md text-left transition-colors',
                isEmpty ? 'bg-brand/10 text-brand font-medium' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              <span className="truncate">{placeholder}</span>
              {isEmpty && <Check size={12} className="shrink-0" />}
            </button>
          )}
          {options.map((o) => {
            const isSelected = String(o.value) === String(value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(String(o.value)); setOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[12px] rounded-md text-left transition-colors',
                  isSelected ? 'bg-brand/10 text-brand font-medium' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <span className="truncate">{o.label}</span>
                {isSelected && <Check size={12} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
