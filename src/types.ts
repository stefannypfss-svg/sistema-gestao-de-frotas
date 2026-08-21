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
  marca?: string;
  modelo: string;
  franquia: number;
  valorLocacao: number;
  ano: string;
  infoImplemento?: string;
  placa: string;
  renavam?: string;
  chassi: string;
  localizacaoAtual: string;
  /** Mobilizado = em obra · Desmobilizado = na base */
  situacao: SituacaoEquipamento;
  /** Condição operacional: em operação, disponível para locar ou em manutenção */
  statusOperacional: StatusOperacional;
  /** false = equipamento desativado (vendido, baixado, sucateado) */
  ativo: boolean;
  // Dados técnicos / financeiros (importados da planilha)
  statusGeral?: string;
  tipoContrato?: string;
  empresaAquisidora?: string;
  valorCompra?: number;
  fornecedor?: string;
  nNotaFiscal?: string;
  dataCompra?: string;
  valorAnuncioVenda?: number;
  tempoDepreciacao?: number;
  valorMercado?: number;
  previsaoLiberacao?: string;
  acao?: string;
  previsaoMobilizacao?: string;
  obs?: string;
  seguro?: string;
  rastreador?: string;
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

export interface EquipamentoObra {
  id: string;
  prefixo: string;
  obra: string;
  situacao: SituacaoEquipamento;
  dataRecebimento?: string;
  dataLiberacaoMecanica?: string;
  dataMobilizacao?: string;
  dataDesmobilizacao?: string;
  dataEnvio?: string;
  observacao?: string;
}

/** Valor de locação de uma descrição de equipamento em uma obra específica. */
export interface TabelaLocacao {
  /** ID estável derivado de `${descricao}||${obra}`. */
  id: string;
  descricao: string;
  obra: string;
  valor: number;
}

/** Avaliação da Cortez Engenharia em uma avaria. */
export type AvaliacaoCortezEngenharia =
  | 'Pendente'
  | 'Aprovado para inclusão na medição'
  | 'Aprovado para compra pela Cortez Engenharia'
  | 'Reprovado'
  | '';

export interface AvariaMaterial {
  id: string;
  material: string;
  qtd: number | null;
  fator: number | null;
  valorUnitario: number | null;
  percentualBitributacao: number; // default 14.58
}

export interface AvariaIncidente {
  id: string;
  prefixo: string;
  obra: string;
  dataSinistro: string;       // YYYY-MM-DD
  descricao: string;
  materiais: AvariaMaterial[];
  relatorioEnviado: 'Sim' | 'Não' | '';
  dataEnvioRelatorio: string; // YYYY-MM-DD
  avaliacaoCortez: AvaliacaoCortezEngenharia;
  valorAprovado: number | null;
  observacao: string;
}

/** Status diário de disponibilidade de um equipamento. */
export type DisponibilidadeStatus = 'EO' | 'M' | 'D' | 'V' | 'PL' | 'AO' | 'UG';

export interface DisponibilidadeRecord {
  /** ID composto: `${prefixo}||${YYYY-MM-DD}` */
  id: string;
  prefixo: string;
  data: string; // YYYY-MM-DD
  status: DisponibilidadeStatus;
  /** Horário de início da manutenção (HH:mm), aplicável quando status === 'M'. Pode ser preenchido depois. */
  horaInicio?: string;
  /** Horário de fim da manutenção (HH:mm), aplicável quando status === 'M'. Pode ser preenchido depois. */
  horaFim?: string;
  /** Vínculo com o evento de manutenção — preenchido apenas quando status === 'M'. */
  eventoId?: string;
}

/** Classificação de um evento de manutenção. */
export type TipoManutencao = 'Corretiva' | 'Preventiva' | 'Revisão' | 'Sinistro';
export type SistemaManutencao = 'Motor' | 'Hidráulico' | 'Elétrico' | 'Rodante' | 'Estrutura' | 'Outro';

/**
 * Evento de manutenção — sempre derivado dos `status_dia` (DisponibilidadeRecord)
 * vinculados a ele pela função de reconciliação. Nunca escrito à mão.
 */
export interface EventoManutencao {
  id: string;
  prefixo: string;
  dataInicio: string; // YYYY-MM-DD — derivado do bloco de dias vinculados
  dataFim: string;    // YYYY-MM-DD — derivado do bloco de dias vinculados
  tipo: TipoManutencao | null;
  sistema: SistemaManutencao | null;
  nota: string | null;
  /** true = nasceu de "Não, nova ocorrência" — bloqueia merge silencioso nessa fronteira. */
  separacaoManual: boolean;
  /** diasParados = dataFim − dataInicio + 1 (diferença de datas, nunca contagem de registros). */
  diasParados: number;
  horasParadas: number;
  /** true = falta horário em alguma ponta do evento (início ou fim). */
  horasParciais: boolean;
  /**
   * true = o scan de reconciliação bateu no teto de expansão (ver
   * `manutencaoReconciliation.ts`) antes de confirmar a borda real do
   * bloco. O evento foi gravado com o que foi possível ler com segurança —
   * `dataInicio`/`dataFim` podem não refletir o bloco inteiro.
   */
  truncado: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Entidades que possuem identificador único. */
export type Identifiable = Equipment | Work | Allocation;
