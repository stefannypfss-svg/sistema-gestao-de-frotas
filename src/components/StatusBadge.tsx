import React from 'react';
import { EquipmentStatus } from '../types';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: EquipmentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  let styleClasses = "";
  let icon: React.ReactNode = null;

  switch (status) {
    case 'Locado':
      styleClasses = "bg-[#f0faf0] text-[#076600]";
      icon = <span className="text-[8px] leading-none mr-0.5">●</span>;
      break;
    case 'Disponível':
      styleClasses = "bg-[#eff6ff] text-[#1565c0]";
      icon = <span className="text-[10px] leading-none mt-[-2px] mr-0.5">○</span>;
      break;
    case 'Em Manutenção':
      styleClasses = "bg-[#fffbeb] text-[#d97706]";
      icon = <span className="text-[11px] leading-none font-bold mr-0.5">⚠</span>;
      break;
    case 'Vendido':
    default:
      styleClasses = "bg-[#f3f4f6] text-[#6b7280]";
      break;
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium leading-none shrink-0",
      styleClasses,
      className
    )}>
      {icon}
      <span>{status}</span>
    </div>
  );
};
