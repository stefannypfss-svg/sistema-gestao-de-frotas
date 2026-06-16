import React from 'react';
import { EquipmentStatus } from '../types';
import { EQUIPMENT_STATUS_STYLES } from '../config/theme';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: EquipmentStatus;
  className?: string;
}

const ICONS: Partial<Record<EquipmentStatus, React.ReactNode>> = {
  'Locado': <span className="text-[8px] leading-none mr-0.5">●</span>,
  'Disponível': <span className="text-[10px] leading-none -mt-0.5 mr-0.5">○</span>,
  'Em Manutenção': <span className="text-[11px] leading-none font-bold mr-0.5">⚠</span>,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => (
  <div
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium leading-none shrink-0',
      EQUIPMENT_STATUS_STYLES[status].chip,
      className,
    )}
  >
    {ICONS[status]}
    <span>{status}</span>
  </div>
);
