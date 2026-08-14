import React from 'react';
import { SituacaoEquipamento, StatusOperacional } from '../types';
import { SITUACAO_STYLES, STATUS_OPERACIONAL_STYLES } from '../config/theme';
import { cn } from '../lib/utils';

interface SituacaoBadgeProps {
  situacao: SituacaoEquipamento;
  className?: string;
}

export const SituacaoBadge: React.FC<SituacaoBadgeProps> = ({ situacao, className }) => (
  <div
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none shrink-0 uppercase tracking-wide',
      SITUACAO_STYLES[situacao].chip,
      className,
    )}
  >
    <span
      className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        situacao === 'Mobilizado' ? 'bg-brand' : 'bg-gray-400',
      )}
    />
    {situacao}
  </div>
);

interface StatusOperacionalBadgeProps {
  status: StatusOperacional;
  className?: string;
}

const STATUS_ICONS: Record<StatusOperacional, React.ReactNode> = {
  'Operação':   <span className="text-[8px] leading-none">●</span>,
  'Disponível': <span className="text-[10px] leading-none -mt-0.5">○</span>,
  'Manutenção': <span className="text-[11px] leading-none font-bold">⚠</span>,
};

export const StatusOperacionalBadge: React.FC<StatusOperacionalBadgeProps> = ({ status, className }) => (
  <div
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium leading-none shrink-0',
      STATUS_OPERACIONAL_STYLES[status].chip,
      className,
    )}
  >
    {STATUS_ICONS[status]}
    <span>{status}</span>
  </div>
);

/** Badge para equipamento desativado. */
export const InativoBadge: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium leading-none shrink-0 bg-red-50 text-red-400',
      className,
    )}
  >
    <span className="text-[8px] leading-none">✕</span>
    <span>Inativo</span>
  </div>
);
