/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EquipmentStatus = 'Disponível' | 'Locado' | 'Em Manutenção' | 'Vendido';

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
  status: EquipmentStatus;
}

export type AllocationType = 'Atual' | 'Previsto';
export type AllocationStatus = 'Planejado' | 'Confirmado' | 'Cancelado';

export type WorkStatus = 'Ativa' | 'Encerrada' | 'Suspensa';

export interface Work {
  id: string;
  nome: string;
  cliente: string;
  status: WorkStatus;
  observacoes: string;
}

export interface Allocation {
  id: string;
  prefixo: string;
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
