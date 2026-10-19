import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectPickerProps {
  label: string;
  options: MultiSelectOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** 'list' = uma coluna, rótulos longos (obra, grupo). 'grid' = grade compacta, rótulos curtos (mês, ano). */
  layout?: 'list' | 'grid';
  gridColumns?: number;
}

/**
 * Filtro de seleção múltipla padronizado: botão + popover com checkboxes,
 * "Selecionar todos"/"Limpar". Vazio = sem filtro (equivale a "Todos"), sem
 * precisar marcar item por item pra não restringir nada.
 */
export function MultiSelectPicker({
  label,
  options,
  selected,
  onChange,
  layout = 'list',
  gridColumns = 3,
}: MultiSelectPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const labelPorValor = new Map(options.map((o) => [o.value, o.label]));
  const resumo = selected.size === 0
    ? 'Todos'
    : selected.size <= 2
      ? [...selected].map((v) => labelPorValor.get(v) ?? v).join(', ')
      : `${selected.size} selecionados`;

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-[38px] px-3 flex items-center gap-1.5 text-[13px] bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors min-w-[150px] max-w-[240px]',
          selected.size > 0 ? 'text-gray-900 font-medium' : 'text-gray-400',
        )}
      >
        <span className="truncate">{resumo}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-auto" />
      </button>

      {open && (
        <div className={cn('absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 max-h-[320px] overflow-y-auto', layout === 'grid' ? 'w-[220px]' : 'w-[260px]')}>
          <div className="flex items-center justify-between px-1 pb-1.5 mb-1.5 border-b border-gray-100 sticky top-0 bg-white">
            <button
              onClick={() => onChange(new Set(options.map((o) => o.value)))}
              className="text-[11px] font-medium text-brand hover:underline"
            >
              Selecionar todos
            </button>
            <button
              onClick={() => onChange(new Set())}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >
              Limpar
            </button>
          </div>

          {layout === 'grid' ? (
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
              {options.map((opt) => {
                const isSelected = selected.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const next = new Set(selected);
                      next.has(opt.value) ? next.delete(opt.value) : next.add(opt.value);
                      onChange(next);
                    }}
                    className={cn(
                      'h-8 flex items-center justify-center text-[11px] font-medium rounded-md transition-colors capitalize',
                      isSelected ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {options.map((opt) => {
                const isSelected = selected.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const next = new Set(selected);
                      next.has(opt.value) ? next.delete(opt.value) : next.add(opt.value);
                      onChange(next);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 text-[12px] rounded-md text-left transition-colors',
                      isSelected ? 'bg-brand/10 text-brand font-medium' : 'text-gray-600 hover:bg-gray-100',
                    )}
                  >
                    <span className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                      isSelected ? 'bg-brand border-brand' : 'border-gray-300',
                    )}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
