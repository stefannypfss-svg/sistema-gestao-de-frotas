import { Equipment, Allocation, EquipmentStatus } from '../types';
import { HOME_BASE } from '../config/theme';

/**
 * Localização atual de um equipamento, derivada da alocação confirmada mais
 * recente. Sem alocação confirmada, está na base.
 */
export function getEquipmentLocation(
  prefixo: string,
  allocations: Allocation[],
): string {
  const confirmed = allocations
    .filter((a) => a.prefixo === prefixo && a.statusAlocacao === 'Confirmado')
    .sort((a, b) => {
      const dateA = a.dataMobilizacaoReal || a.dataMobilizacao || '';
      const dateB = b.dataMobilizacaoReal || b.dataMobilizacao || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  return confirmed[0]?.obra ?? HOME_BASE;
}

export interface FleetStats {
  total: number;
  locados: number;
  disponiveis: number;
  manutencao: number;
  planejados: number;
}

/** Contagens agregadas da frota, usadas nos cards de indicadores. */
export function computeFleetStats(
  equipments: Equipment[],
  allocations: Allocation[],
): FleetStats {
  const countByStatus = (status: EquipmentStatus) =>
    equipments.filter((e) => e.status === status).length;

  return {
    total: equipments.length,
    locados: countByStatus('Locado'),
    disponiveis: countByStatus('Disponível'),
    manutencao: countByStatus('Em Manutenção'),
    planejados: allocations.filter((a) => a.statusAlocacao === 'Planejado').length,
  };
}

/** Lista ordenada e única de famílias presentes na frota. */
export function uniqueFamilies(equipments: Equipment[]): string[] {
  return Array.from(new Set(equipments.map((e) => e.familia))).sort();
}

/** Percentual formatado (pt-BR) de uma parcela sobre o total. */
export function percentOfFleet(part: number, total: number): string {
  return ((part / (total || 1)) * 100).toFixed(1).replace('.', ',');
}
