import { startOfMonth, endOfMonth, addMonths, parseISO } from 'date-fns';
import { Equipment, Allocation } from '../types';

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

export interface ForecastResult {
  months: Date[];
  rows: ForecastRow[];
  /** Totais mensais brutos (sem ajuste de eficiência). */
  monthlyTotals: number[];
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
