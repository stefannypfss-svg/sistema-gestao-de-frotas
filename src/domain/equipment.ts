import { Equipment, Allocation } from '../types';
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
  totalAtivos: number;
  mobilizados: number;
  disponiveis: number;
  manutencao: number;
  inativos: number;
}

/** Contagens agregadas da frota, usadas nos cards de indicadores. */
export function computeFleetStats(
  equipments: Equipment[],
  _allocations: Allocation[],
): FleetStats {
  const ativos = equipments.filter((e) => e.ativo);
  return {
    totalAtivos: ativos.length,
    mobilizados: ativos.filter((e) => e.situacao === 'Mobilizado').length,
    disponiveis: ativos.filter((e) => e.statusOperacional === 'Disponível').length,
    manutencao:  ativos.filter((e) => e.statusOperacional === 'Manutenção').length,
    inativos:    equipments.filter((e) => !e.ativo).length,
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
