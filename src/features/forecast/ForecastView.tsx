import React from 'react';
import { Download, Filter, Building2, Clock, Percent, Eraser } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Equipment, Allocation, Work } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { uniqueFamilies } from '../../domain/equipment';
import { computeForecast } from '../../domain/forecast';
import { PageHeader, Button, Card, FilterSelect } from '../../components/ui';

interface ForecastViewProps {
  equipments: Equipment[];
  allocations: Allocation[];
  works: Work[];
}

const EFFICIENCY_OPTIONS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

export const ForecastView: React.FC<ForecastViewProps> = ({
  equipments,
  allocations,
  works,
}) => {
  const [period, setPeriod] = React.useState(12);
  const [filterType, setFilterType] = React.useState('Todos');
  const [filterObra, setFilterObra] = React.useState('');
  const [filterFamily, setFilterFamily] = React.useState('');
  const [efficiency, setEfficiency] = React.useState(100);

  const obras = works.map((w) => w.nome).sort();
  const families = uniqueFamilies(equipments);

  const { months, rows, monthlyTotals } = computeForecast(equipments, allocations, {
    period,
    filterType,
    filterObra,
    filterFamily,
  });

  const effectiveTotals = monthlyTotals.map((t) => (t * efficiency) / 100);
  const grandTotal = effectiveTotals.reduce((sum, v) => sum + v, 0);

  const clearFilters = () => {
    setPeriod(12);
    setFilterType('Todos');
    setFilterObra('');
    setFilterFamily('');
    setEfficiency(100);
  };

  const exportToCSV = () => {
    const headers = ['Prefixo', 'Equipamento', ...months.map((m) => format(m, 'MMM/yy', { locale: ptBR }))];
    const csvRows = rows.map((row) => [
      row.prefixo,
      row.familia,
      ...row.monthlyValues.map((v) => v.value.toString()),
    ]);
    const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'previsao_receitas_cortez.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Previsão de Receitas"
        description="Estimativa baseada no planejamento vigente"
        action={
          <Button onClick={exportToCSV}>
            <Download size={16} /> Exportar CSV
          </Button>
        }
      />

      <Card className="rounded-xl">
        <div className="px-5 py-4 flex flex-wrap gap-6 items-center">
          <ForecastFilter label="Período" icon={Clock}>
            <FilterSelect
              value={period}
              onChange={(v) => setPeriod(Number(v))}
              options={[
                { value: 6, label: 'Próximos 6 meses' },
                { value: 12, label: 'Próximos 12 meses' },
                { value: 24, label: 'Próximos 24 meses' },
              ]}
            />
          </ForecastFilter>
          <ForecastFilter label="Obra" icon={Building2}>
            <FilterSelect
              value={filterObra}
              onChange={setFilterObra}
              placeholder="Todas as Obras"
              options={obras.map((o) => ({ value: o, label: o }))}
            />
          </ForecastFilter>
          <ForecastFilter label="Tipo" icon={Filter}>
            <FilterSelect
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'Todos', label: 'Todas' },
                { value: 'Atual', label: 'Status Atual' },
                { value: 'Previsto', label: 'Previsto' },
              ]}
            />
          </ForecastFilter>
          <ForecastFilter label="Família" icon={Filter}>
            <FilterSelect
              value={filterFamily}
              onChange={setFilterFamily}
              placeholder="Todas as Famílias"
              options={families.map((f) => ({ value: f, label: f }))}
            />
          </ForecastFilter>
          <ForecastFilter label="Eficiência" icon={Percent}>
            <FilterSelect
              value={efficiency}
              onChange={(v) => setEfficiency(Number(v))}
              options={EFFICIENCY_OPTIONS.map((v) => ({ value: v, label: `${v}%` }))}
            />
          </ForecastFilter>
          <button
            type="button"
            onClick={clearFilters}
            title="Limpar filtros"
            className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white border border-line text-gray-500 hover:bg-surface-muted transition-colors shadow-sm self-end"
          >
            <Eraser size={16} />
          </button>

          <div className="md:ml-auto bg-white border border-line rounded-2xl px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col min-w-[280px]">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-gray-500 mb-1">
              Receita Total Prevista
            </span>
            <span className="text-[32px] font-bold text-brand leading-none mt-1">
              {formatCurrency(grandTotal)}
            </span>
            <span className="mt-2 text-[11px] text-gray-500">
              Valor ajustado em {efficiency}% de eficiência
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="sticky left-0 z-20 bg-surface-muted px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] border-r border-line min-w-[280px]">
                  Equipamento
                </th>
                {months.map((m) => (
                  <th key={m.toISOString()} className="px-6 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-right min-w-[150px] border-l border-gray-100 bg-surface-muted">
                    {format(m, 'MMM/yy', { locale: ptBR })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.prefixo} className="hover:bg-brand-light transition-colors group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-brand-light/45 px-8 py-4 border-r border-line">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-semibold text-brand">{row.prefixo}</span>
                      <span className="text-[12px] text-gray-500 leading-tight">{row.familia}</span>
                    </div>
                  </td>
                  {row.monthlyValues.map((v, i) => {
                    const adjusted = (v.value * efficiency) / 100;
                    return (
                      <td
                        key={i}
                        className={cn(
                          'px-6 py-4 text-right border-l border-gray-50/50 text-[13px]',
                          adjusted > 0 ? 'font-medium text-gray-900' : 'text-gray-300',
                        )}
                      >
                        {formatCurrency(adjusted)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-muted border-t border-line">
                <td className="sticky left-0 z-10 bg-surface-muted px-8 py-5 font-semibold text-gray-900 text-[11px] uppercase tracking-[0.05em] border-r border-line">
                  Total Mensal
                </td>
                {effectiveTotals.map((t, i) => (
                  <td key={i} className="px-6 py-5 text-right font-semibold text-brand text-[13px] whitespace-nowrap border-l border-gray-100">
                    {formatCurrency(t)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};

const ForecastFilter: React.FC<{
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex flex-col">
    <label className="text-[11px] font-medium uppercase tracking-[0.05em] text-gray-500 mb-[6px] ml-1">
      {label}
    </label>
    {children}
  </div>
);
