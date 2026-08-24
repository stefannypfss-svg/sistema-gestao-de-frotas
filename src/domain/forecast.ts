import { startOfMonth, endOfMonth, addMonths, parseISO, format, addDays } from 'date-fns';

/** Interpreta YYYY-MM-DD como meia-noite LOCAL (evita desvio UTC × fuso-horário). */
function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
import { Equipment, Allocation, EquipamentoObra, TabelaLocacao, DisponibilidadeRecord, EventoManutencao } from '../types';

export interface MonthlyValue {
  value: number;
  obra: string;
  tipo: string;
}

export interface ForecastRow extends Equipment {
  monthlyValues: MonthlyValue[];
}

export interface ForecastFilters {
  period: number;
  filterType: string;
  filterObra: string;
  filterFamily: string;
}

export interface ForecastFiltersEquipObra {
  period: number;
  filterObra: string;
  filterFamily: string;
}

export interface ForecastResult {
  months: Date[];
  rows: ForecastRow[];
  /** Totais mensais brutos (sem ajuste de eficiência). */
  monthlyTotals: number[];
  /** Período de medição (20 → 19) de cada coluna, na mesma ordem de `months`. Só `computeForecastFromEquipObra` preenche. */
  periodos?: PeriodoMedicao[];
}

/** Período de medição: dia 20 de um mês até dia 19 do seguinte, rotulado pelo mês do dia 19. */
export interface PeriodoMedicao {
  /** Mês usado como rótulo na tela (ex.: "jul/26" para o período 20/06–19/07). */
  rotulo: Date;
  inicio: Date;
  fim: Date;
}

/** Período de medição cujo rótulo é `mesRotulo` (dia 1 do mês, qualquer). */
function periodoMedicaoDoRotulo(mesRotulo: Date): PeriodoMedicao {
  const fim = new Date(mesRotulo.getFullYear(), mesRotulo.getMonth(), 19);
  const inicio = new Date(mesRotulo.getFullYear(), mesRotulo.getMonth() - 1, 20);
  return { rotulo: mesRotulo, inicio, fim };
}

/** Mês-rótulo do período de medição que contém `hoje`. */
function mesRotuloAtual(hoje: Date): Date {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  // Depois do dia 19, a medição corrente já pertence ao período do mês seguinte.
  return hoje.getDate() >= 20 ? addMonths(base, 1) : base;
}

/** Período de medição corrente (20 → 19) — útil pra quem só precisa da janela de hoje. */
export function periodoMedicaoAtual(hoje: Date = new Date()): PeriodoMedicao {
  return periodoMedicaoDoRotulo(mesRotuloAtual(hoje));
}

/** Dias entre `inicio` e `ate`, incluindo ambas as pontas. */
function diasEntre(inicio: Date, ate: Date): number {
  return Math.round((ate.getTime() - inicio.getTime()) / 86400000) + 1;
}

/**
 * Projeta a receita mês a mês a partir das alocações ativas de cada
 * equipamento. Lógica pura — sem React e sem formatação.
 */
export function computeForecast(
  equipments: Equipment[],
  allocations: Allocation[],
  { period, filterType, filterObra, filterFamily }: ForecastFilters,
): ForecastResult {
  const start = startOfMonth(new Date());
  const months = Array.from({ length: period }, (_, i) => addMonths(start, i));

  const rows: ForecastRow[] = equipments
    .map((eq) => {
      const eqAllocs = allocations.filter((a) => a.prefixo === eq.prefixo);
      const monthlyValues = months.map<MonthlyValue>((month) => {
        const startM = startOfMonth(month);
        const endM = endOfMonth(month);
        const active = eqAllocs.find((a) => {
          const mob = parseISO(a.dataMobilizacao);
          const desmob = a.dataDesmobilizacao ? parseISO(a.dataDesmobilizacao) : null;
          const overlaps = mob <= endM && (!desmob || desmob >= startM);
          const matchesType = filterType === 'Todos' || a.tipo === filterType;
          const matchesObra = !filterObra || a.obra === filterObra;
          return overlaps && a.statusAlocacao !== 'Cancelado' && matchesType && matchesObra;
        });
        return {
          value: active ? active.valorLocacao : 0,
          obra: active?.obra ?? '',
          tipo: active?.tipo ?? '',
        };
      });
      return { ...eq, monthlyValues };
    })
    .filter((row) => {
      const matchesFamily = !filterFamily || row.familia === filterFamily;
      const hasRevenue = row.monthlyValues.some((v) => v.value > 0);
      return matchesFamily && hasRevenue;
    });

  const monthlyTotals = months.map((_, i) =>
    rows.reduce((sum, row) => sum + row.monthlyValues[i].value, 0),
  );

  return { months, rows, monthlyTotals };
}

/** Info pré-processada pra decidir, por prefixo+dia, se o dia deve ser excluído da receita. */
interface DiasExcluidosInfo {
  statusPorDia: Map<string, DisponibilidadeRecord['status']>;
  tipoEfetivoPorDia: Map<string, string | null>;
}

/**
 * Agrupa `disponibilidade` por prefixo e, dentro de cada bloco de dias M
 * calendário-contíguos, propaga o `tipo` do evento vinculado (se algum dia
 * do bloco tiver `eventoId`) pros demais dias do mesmo bloco que não
 * tiverem — dado legado/não tocado pela reconciliação assume a
 * classificação do resto do bloco em vez de ficar "desconhecido".
 */
function construirInfoExclusao(
  disponibilidade: DisponibilidadeRecord[],
  eventosManutencao: EventoManutencao[],
): DiasExcluidosInfo {
  const eventosPorId = new Map(eventosManutencao.map((e) => [e.id, e]));
  const statusPorDia = new Map<string, DisponibilidadeRecord['status']>();
  const tipoEfetivoPorDia = new Map<string, string | null>();
  const diasMPorPrefixo = new Map<string, DisponibilidadeRecord[]>();

  disponibilidade.forEach((r) => {
    statusPorDia.set(`${r.prefixo}||${r.data}`, r.status);
    if (r.status === 'M') {
      const lista = diasMPorPrefixo.get(r.prefixo) ?? [];
      lista.push(r);
      diasMPorPrefixo.set(r.prefixo, lista);
    }
  });

  diasMPorPrefixo.forEach((registros, prefixo) => {
    registros.sort((a, b) => a.data.localeCompare(b.data));
    let i = 0;
    while (i < registros.length) {
      let j = i;
      while (
        j + 1 < registros.length &&
        format(addDays(new Date(registros[j].data + 'T12:00:00'), 1), 'yyyy-MM-dd') === registros[j + 1].data
      ) {
        j++;
      }
      const bloco = registros.slice(i, j + 1);
      const comEvento = bloco.find((r) => r.eventoId && eventosPorId.has(r.eventoId));
      const tipoDoBloco = comEvento ? eventosPorId.get(comEvento.eventoId!)!.tipo : null;
      bloco.forEach((r) => tipoEfetivoPorDia.set(`${prefixo}||${r.data}`, tipoDoBloco));
      i = j + 1;
    }
  });

  return { statusPorDia, tipoEfetivoPorDia };
}

/**
 * Conta dias, em `[inicio, fim]`, com status M (exceto tipo Sinistro) ou AO
 * — esses dias não geram receita. Nunca desconta datas futuras (depois de
 * `hoje`): se ainda não aconteceu, a projeção assume operação normal.
 */
function contarDiasExcluidos(
  prefixo: string,
  inicio: Date,
  fim: Date,
  hoje: Date,
  info: DiasExcluidosInfo,
): number {
  const fimEfetivo = fim < hoje ? fim : hoje;
  if (inicio > fimEfetivo) return 0;

  let count = 0;
  for (let d = new Date(inicio); d <= fimEfetivo; d = addDays(d, 1)) {
    const chave = `${prefixo}||${format(d, 'yyyy-MM-dd')}`;
    const status = info.statusPorDia.get(chave);
    if (status === 'AO') {
      count++;
    } else if (status === 'M' && info.tipoEfetivoPorDia.get(chave) !== 'Sinistro') {
      count++;
    }
  }
  return count;
}

/**
 * Projeta receita usando EquipamentoObra (localização atual) + TabelaLocacao (valores).
 * Registros ativos = sem dataEnvio. O valor mensal vem da tabela de locação
 * keyed por (equipment.descricao, registro.obra).
 *
 * Cada "mês" é o período de medição da frota: dia 20 do mês anterior até
 * dia 19 do mês rotulado (ex.: "julho" = 20/06 a 19/07) — não o mês
 * calendário. `diasBase` (o divisor de 30) continua fixo, só o intervalo de
 * dias considerado mobilizado/excluído é que segue esse período.
 *
 * Dias com status Manutenção (exceto tipo Sinistro) ou Apoio Oficina na
 * Disponibilidade não contam como receita — só até a data de hoje; dias
 * futuros já marcados M/AO (ex.: manutenção preventiva agendada) ainda
 * contam normalmente, já que ainda não aconteceram.
 */
export function computeForecastFromEquipObra(
  equipments: Equipment[],
  equipamentoObra: EquipamentoObra[],
  tabelaLocacao: TabelaLocacao[],
  { period, filterObra, filterFamily }: ForecastFiltersEquipObra,
  disponibilidade: DisponibilidadeRecord[],
  eventosManutencao: EventoManutencao[],
): ForecastResult & { periodos: PeriodoMedicao[] } {
  const hoje = new Date();
  const primeiroRotulo = mesRotuloAtual(hoje);
  const months = Array.from({ length: period }, (_, i) => addMonths(primeiroRotulo, i));
  const periodos = months.map(periodoMedicaoDoRotulo);

  // Lookup: `${descricao}||${obra}` → valor
  const valorMap = new Map<string, number>();
  tabelaLocacao.forEach((t) => valorMap.set(`${t.descricao}||${t.obra}`, t.valor));

  // Apenas registros sem dataEnvio (ativos)
  const ativos = equipamentoObra.filter((r) => !r.dataEnvio);
  const infoExclusao = construirInfoExclusao(disponibilidade, eventosManutencao);

  const rows: ForecastRow[] = equipments
    .map((eq) => {
      const registro = ativos.find((r) => r.prefixo === eq.prefixo);
      if (!registro) return null;

      const obra = registro.obra;
      if (filterObra && obra !== filterObra) return null;
      if (filterFamily && eq.familia !== filterFamily) return null;

      const valor = valorMap.get(`${eq.descricao}||${obra}`) ?? 0;

      const mobDate = registro.dataMobilizacao ? parseDateLocal(registro.dataMobilizacao) : periodos[0].inicio;
      const desmobDate = registro.dataDesmobilizacao ? parseDateLocal(registro.dataDesmobilizacao) : null;

      const monthlyValues = periodos.map<MonthlyValue>(({ inicio: startM, fim: endM }) => {
        // Sem valor ou ainda não mobilizado
        if (valor === 0 || mobDate > endM) return { value: 0, obra: '', tipo: 'Atual' };

        // Após o período de desmobilização → sem receita
        if (desmobDate && startM > desmobDate) return { value: 0, obra: '', tipo: 'Atual' };

        let monthValue = valor;
        let diasBase = 30;

        // Período de desmobilização: proporcional do início do período até a desmob
        if (desmobDate && desmobDate >= startM && desmobDate <= endM) {
          diasBase = diasEntre(startM, desmobDate);
          monthValue = Math.round((valor / 30) * diasBase);
        }

        // Período de mobilização: proporcional do início do período até a mob
        if (mobDate >= startM && mobDate <= endM) {
          diasBase = diasEntre(startM, mobDate);
          monthValue = Math.round((valor / 30) * diasBase);
        }

        // Desconta dias M (não-Sinistro) e AO dentro do trecho mobilizado deste período
        const inicioMobilizado = mobDate > startM ? mobDate : startM;
        const fimMobilizado = desmobDate && desmobDate < endM ? desmobDate : endM;
        const diasExcluidos = contarDiasExcluidos(eq.prefixo, inicioMobilizado, fimMobilizado, hoje, infoExclusao);
        if (diasExcluidos > 0) {
          monthValue = Math.round((valor / 30) * Math.max(0, diasBase - diasExcluidos));
        }

        return { value: monthValue, obra, tipo: 'Atual' };
      });

      return { ...eq, monthlyValues };
    })
    .filter((row): row is ForecastRow => row !== null && row.monthlyValues.some((v) => v.value > 0));

  const monthlyTotals = months.map((_, i) =>
    rows.reduce((sum, row) => sum + row.monthlyValues[i].value, 0),
  );

  return { months, rows, monthlyTotals, periodos };
}
