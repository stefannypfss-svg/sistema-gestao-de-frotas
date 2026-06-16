/**
 * Mapas de estilo orientados a status.
 *
 * Para cores estáticas use as classes do Tailwind (text-brand, bg-info-light...).
 * Use estes mapas quando a cor é escolhida em runtime a partir de um valor de
 * domínio (status de equipamento, status de alocação), mantendo as classes
 * estáveis e analisáveis pelo Tailwind.
 */
import { EquipmentStatus, AllocationStatus, WorkStatus } from '../types';

export interface BadgeStyle {
  /** Classe de fundo + texto para chips/badges */
  chip: string;
  /** Classe de cor do texto isolada */
  text: string;
  /** Classe de fundo sólida (barras, indicadores) */
  solid: string;
}

export const EQUIPMENT_STATUS_STYLES: Record<EquipmentStatus, BadgeStyle> = {
  'Locado': { chip: 'bg-brand-light text-brand', text: 'text-brand', solid: 'bg-brand' },
  'Disponível': { chip: 'bg-info-light text-info', text: 'text-info', solid: 'bg-info' },
  'Em Manutenção': { chip: 'bg-warning-light text-warning', text: 'text-warning', solid: 'bg-warning' },
  'Vendido': { chip: 'bg-gray-100 text-gray-500', text: 'text-gray-500', solid: 'bg-gray-400' },
};

export const ALLOCATION_STATUS_STYLES: Record<AllocationStatus, BadgeStyle> = {
  'Confirmado': { chip: 'bg-brand-light text-brand', text: 'text-brand', solid: 'bg-brand' },
  'Planejado': { chip: 'bg-planned-light text-planned', text: 'text-planned', solid: 'bg-planned' },
  'Cancelado': { chip: 'bg-gray-100 text-gray-500', text: 'text-gray-500', solid: 'bg-gray-400' },
};

export const WORK_STATUS_STYLES: Record<WorkStatus, BadgeStyle> = {
  'Ativa': { chip: 'bg-brand-light text-brand', text: 'text-brand', solid: 'bg-brand' },
  'Suspensa': { chip: 'bg-warning-light text-warning', text: 'text-warning', solid: 'bg-warning' },
  'Encerrada': { chip: 'bg-gray-100 text-gray-500', text: 'text-gray-500', solid: 'bg-gray-400' },
};

/** Local físico onde a frota fica quando não alocada. */
export const HOME_BASE = 'Central de Equipamentos Rental';
