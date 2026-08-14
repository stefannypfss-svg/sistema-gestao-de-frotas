/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Onde o equipamento está fisicamente: em obra ou na base. */
export type SituacaoEquipamento = 'Mobilizado' | 'Desmobilizado';

/** Condição operacional do equipamento. */
export type StatusOperacional = 'Operação' | 'Disponível' | 'Manutenção';

export interface Equipment {
  prefixo: string;
  grupo: string;
  grupoEquipamento: string;
  familia: string;
  descricao: string;
  modelo: string;
  franquia: number;
  valorLocacao: number;
  ano: string;
  placa: string;
  chassi: string;
  localizacaoAtual: string;
  /** Mobilizado = em obra · Desmobilizado = na base */
  situacao: SituacaoEquipamento;
  /** Condição operacional: em operação, disponível para locar ou em manutenção */
  statusOperacional: StatusOperacional;
  /** false = equipamento desativado (vendido, baixado, sucateado) */
  ativo: boolean;
}

export type AllocationType = 'Atual' | 'Previsto';
export type AllocationStatus = 'Planejado' | 'Confirmado' | 'Cancelado';

export type WorkStatus = 'Ativa' | 'Encerrada' | 'Suspensa';

export interface Work {
  id: string;
  nome: string;
  abreviacao: string;
  cliente: string;
  status: WorkStatus;
  observacoes: string;
}

export interface Allocation {
  id: string;
  prefixo: string;
  /**
   * Referência para a obra (FK futura). Hoje pode estar vazio em dados
   * legados; nesses casos o nome em `obra` é a fonte de verdade.
   */
  obraId: string;
  /** Nome da obra mantido para exibição e compatibilidade com dados legados. */
  obra: string;
  tipo: AllocationType;
  statusAlocacao: AllocationStatus;
  dataMobilizacao: string; // ISO string
  dataDesmobilizacao: string | null; // ISO string or null
  dataMobilizacaoReal: string | null; // ISO string or null
  dataDesmobilizacaoReal: string | null; // ISO string or null
  valorLocacao: number;
  observacoes: string;
}

/** Entidades que possuem identificador único. */
export type Identifiable = Equipment | Work | Allocation;
