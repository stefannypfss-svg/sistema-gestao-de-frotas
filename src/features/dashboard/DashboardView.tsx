import React, { useMemo } from 'react';
import { Search, Eraser, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EquipamentoObra, Equipment, DisponibilidadeStatus } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { useDisponibilidadeHoje } from '../../hooks/useDisponibilidadeHoje';
import { cn } from '../../lib/utils';
import { Card, StatCard, StateMessage } from '../../components/ui';

interface Props {
  registros: Collection<EquipamentoObra>;
  equipments: Collection<Equipment>;
}

const TODAY_STR = format(new Date(), 'yyyy-MM-dd');

const DISP_STATUS_CONFIG: Record<DisponibilidadeStatus, { label: string; bg: string; text: string }> = {
  EO: { label: 'Em Operação',     bg: 'bg-green-100',   text: 'text-green-800'  },
  D:  { label: 'Disponível',      bg: 'bg-amber-50',    text: 'text-amber-700'  },
  M:  { label: 'Manutenção',      bg: 'bg-red-100',     text: 'text-red-700'    },
  PL: { label: 'Proc. Liberação', bg: 'bg-sky-100',     text: 'text-sky-700'    },
  AO: { label: 'Apoio Oficina',   bg: 'bg-violet-100',  text: 'text-violet-700' },
  UG: { label: 'Uso Gerencial',   bg: 'bg-slate-100',   text: 'text-slate-600'  },
  V:  { label: 'Venda',           bg: 'bg-orange-100',  text: 'text-orange-700' },
};
const DISP_STATUS_ORDER: DisponibilidadeStatus[] = ['EO', 'D', 'M', 'PL', 'AO', 'UG', 'V'];

interface ChartFilters { situacao: string | null; obra: string | null; }

const BAR_COLORS = [
  '#16a34a', '#22c55e', '#4ade80', '#86efac',
  '#15803d', '#166534', '#14532d', '#052e16',
];

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

interface DonutSegment { label: string; value: number; color: string }

function DonutChart({
  segments, title, centerLabel, centerValue, selected, onSelect,
}: {
  segments: DonutSegment[];
  title: string;
  centerLabel: string;
  centerValue: string;
  selected?: string | null;
  onSelect: (label: string, evt: React.MouseEvent) => void;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const R = 38;
  const C = 2 * Math.PI * R;
  let cum = 0;
  const arcs = segments.map((seg) => {
    const arcLen = total > 0 ? (seg.value / total) * C : 0;
    const dashoffset = -cum;
    cum += arcLen;
    return { ...seg, arcLen, dashoffset };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="w-full text-[12px] font-semibold text-gray-500 uppercase tracking-wide text-left">{title}</p>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#f3f4f6" strokeWidth="14" />
          {total > 0 && arcs.map((seg, i) => (
            <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${seg.arcLen} ${C}`}
              strokeDashoffset={seg.dashoffset}
              style={{ opacity: selected && selected !== seg.label ? 0.25 : 1, transition: 'opacity 0.2s' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[18px] font-bold text-gray-900 leading-none">{centerValue}</span>
          <span className="text-[10px] text-gray-400 leading-none">{centerLabel}</span>
        </div>
      </div>
      <div className="w-full space-y-1.5">
        {segments.map((seg, i) => {
          const isSelected = selected === seg.label;
          const isDimmed = selected && !isSelected;
          return (
            <button key={i} onClick={(evt) => onSelect(seg.label, evt)}
              title="Clique para filtrar · CTRL+clique para combinar"
              className={cn('w-full flex items-center justify-between px-2 py-1 rounded-lg transition-all cursor-pointer',
                isSelected ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50', isDimmed && 'opacity-40')}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className={cn('text-[11px]', isSelected ? 'font-semibold text-gray-900' : 'text-gray-600')}>{seg.label}</span>
              </div>
              <span className={cn('text-[11px]', isSelected ? 'font-bold text-gray-900' : 'font-semibold text-gray-700')}>{seg.value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DonutChartValue({
  segments, title, centerValue, selected, onSelect,
}: {
  segments: DonutSegment[];
  title: string;
  centerValue: string;
  selected?: string | null;
  onSelect: (label: string, evt: React.MouseEvent) => void;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const R = 38;
  const C = 2 * Math.PI * R;
  let cum = 0;
  const arcs = segments.map((seg) => {
    const arcLen = total > 0 ? (seg.value / total) * C : 0;
    const dashoffset = -cum;
    cum += arcLen;
    return { ...seg, arcLen, dashoffset };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="w-full text-[12px] font-semibold text-gray-500 uppercase tracking-wide text-left">{title}</p>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#f3f4f6" strokeWidth="14" />
          {total > 0 && arcs.map((seg, i) => (
            <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${seg.arcLen} ${C}`}
              strokeDashoffset={seg.dashoffset}
              style={{ opacity: selected && selected !== seg.label ? 0.25 : 1, transition: 'opacity 0.2s' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[13px] font-bold text-gray-900 leading-none text-center px-2">{centerValue}</span>
        </div>
      </div>
      <div className="w-full space-y-1.5">
        {segments.map((seg, i) => {
          const isSelected = selected === seg.label;
          const isDimmed = selected && !isSelected;
          return (
            <button key={i} onClick={(evt) => onSelect(seg.label, evt)}
              title="Clique para filtrar · CTRL+clique para combinar"
              className={cn('w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer',
                isSelected ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50', isDimmed && 'opacity-40')}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className={cn('text-[11px] truncate', isSelected ? 'font-semibold text-gray-900' : 'text-gray-600')}>{seg.label}</span>
              </div>
              <span className={cn('text-[10px] flex-shrink-0', isSelected ? 'font-bold text-gray-900' : 'font-semibold text-gray-700')}>{formatBRL(seg.value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart ────────────────────────────────────────────────────

function HorizontalBarChart({
  items, selected, onSelect,
}: {
  items: { label: string; value: number }[];
  selected?: string | null;
  onSelect: (label: string, evt: React.MouseEvent) => void;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isSelected = selected === item.label;
        const isDimmed = selected && !isSelected;
        return (
          <button key={item.label} onClick={(evt) => onSelect(item.label, evt)}
            title="Clique para filtrar · CTRL+clique para combinar"
            className={cn('w-full flex items-center gap-3 px-2 py-1 rounded-lg transition-all text-left',
              isSelected ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50', isDimmed && 'opacity-40')}>
            <span title={item.label}
              className={cn('text-right text-[11px] truncate flex-shrink-0 w-44', isSelected ? 'font-semibold text-gray-800' : 'text-gray-500')}>
              {item.label}
            </span>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(item.value / max) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    opacity: isDimmed ? 0.4 : 1, minWidth: item.value > 0 ? '8px' : '0' }} />
              </div>
              <span className={cn('text-[11px] w-5 text-right flex-shrink-0', isSelected ? 'font-bold text-gray-900' : 'font-bold text-gray-700')}>
                {item.value}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function SituacaoBadge({ situacao }: { situacao: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
      situacao === 'Mobilizado'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-gray-50 text-gray-600 border-gray-200',
    )}>
      {situacao}
    </span>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return iso;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardView({ registros, equipments }: Props) {
  const [search, setSearch] = React.useState('');
  const [filterSituacao, setFilterSituacao] = React.useState('');
  const [filterObra, setFilterObra] = React.useState('');
  const [filterDispStatus, setFilterDispStatus] = React.useState<DisponibilidadeStatus | ''>('');

  // ── Filtros interativos dos gráficos ──
  const [chartFilters, setChartFilters] = React.useState<ChartFilters>({ situacao: null, obra: null });

  function handleChartSelect(type: keyof ChartFilters, value: string, evt: React.MouseEvent) {
    const multi = evt.ctrlKey || evt.metaKey;
    setChartFilters((prev: ChartFilters) => {
      if (multi) return { ...prev, [type]: prev[type] === value ? null : value };
      return { situacao: null, obra: null, [type]: prev[type] === value ? null : value };
    });
  }

  const { items: eqItems, loading: eqLoading, error: eqError } = equipments;

  // Mapa prefixo → Equipment para join
  const eqMap = useMemo(() => {
    const m = new Map<string, Equipment>();
    eqItems.forEach((e) => m.set(e.prefixo, e));
    return m;
  }, [eqItems]);

  // ── Registros ativos: dataEnvio em branco ──
  const active = useMemo(
    () => registros.items.filter((r) => !r.dataEnvio),
    [registros.items],
  );

  // ── KPIs derivados do Equip. por Obra ──
  const totalAtivo = active.length;
  const mobilizadoCount = useMemo(() => active.filter((r) => r.situacao === 'Mobilizado').length, [active]);
  const desmobilizadoCount = useMemo(() => active.filter((r) => r.situacao === 'Desmobilizado').length, [active]);

  const mobilizadoValor = useMemo(
    () => active.filter((r) => r.situacao === 'Mobilizado').reduce((s, r) => s + (eqMap.get(r.prefixo)?.valorLocacao ?? 0), 0),
    [active, eqMap],
  );
  const desmobilizadoValor = useMemo(
    () => active.filter((r) => r.situacao === 'Desmobilizado').reduce((s, r) => s + (eqMap.get(r.prefixo)?.valorLocacao ?? 0), 0),
    [active, eqMap],
  );
  const totalValor = mobilizadoValor + desmobilizadoValor;

  // Taxa de ocupação: mobilizados / total ativo
  const taxaOcupacao = totalAtivo > 0 ? Math.round((mobilizadoCount / totalAtivo) * 100) : 0;

  // Status de disponibilidade de hoje — leitura própria, só o dia de hoje
  // (ver useDisponibilidadeHoje), não a coleção `disponibilidade` inteira.
  const disponibilidadeHoje = useDisponibilidadeHoje(TODAY_STR);
  const dispHoje = useMemo(() => {
    const counts = new Map<DisponibilidadeStatus, number>();
    disponibilidadeHoje.forEach((r) => counts.set(r.status, (counts.get(r.status) ?? 0) + 1));
    return counts;
  }, [disponibilidadeHoje]);

  const dispStatusPorPrefixo = useMemo(() => {
    const m = new Map<string, DisponibilidadeStatus>();
    disponibilidadeHoje.forEach((r) => m.set(r.prefixo, r.status));
    return m;
  }, [disponibilidadeHoje]);

  // ── Dados do gráfico de obras ──
  const obraItems = useMemo(() => {
    const counts = new Map<string, number>();
    active.forEach((r) => counts.set(r.obra, (counts.get(r.obra) ?? 0) + 1));
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [active]);

  // ── Lista de obras para o filtro ──
  const obras = useMemo(() => [...new Set(active.map((r) => r.obra).filter(Boolean))].sort(), [active]);

  // ── Tabela: registros ativos filtrados + join Equipment ──
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return active.filter((r) => {
      if (chartFilters.situacao && r.situacao !== chartFilters.situacao) return false;
      if (chartFilters.obra && r.obra !== chartFilters.obra) return false;
      if (filterSituacao && r.situacao !== filterSituacao) return false;
      if (filterObra && r.obra !== filterObra) return false;
      if (filterDispStatus && dispStatusPorPrefixo.get(r.prefixo) !== filterDispStatus) return false;
      if (!term) return true;
      const eq = eqMap.get(r.prefixo);
      return (
        r.prefixo.toLowerCase().includes(term) ||
        r.obra.toLowerCase().includes(term) ||
        (eq?.familia ?? '').toLowerCase().includes(term) ||
        (eq?.descricao ?? '').toLowerCase().includes(term)
      );
    });
  }, [active, search, filterSituacao, filterObra, filterDispStatus, dispStatusPorPrefixo, chartFilters, eqMap]);

  const clearFilters = () => {
    setSearch(''); setFilterSituacao(''); setFilterObra(''); setFilterDispStatus('');
    setChartFilters({ situacao: null, obra: null });
  };

  const hasChartFilter = chartFilters.situacao || chartFilters.obra;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-gray-900">Dashboard</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Visão geral da frota</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Em Manutenção Hoje */}
        <div className="bg-white rounded-2xl border border-l-4 border-l-red-400 border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Em Manutenção Hoje</span>
          <div className="flex items-end gap-2">
            <span className="text-[28px] font-bold text-gray-900 leading-none">{dispHoje.get('M') ?? 0}</span>
            <span className="text-[12px] text-gray-400 mb-0.5">equip.</span>
          </div>
          <span className="text-[11px] text-gray-400">
            {totalAtivo > 0
              ? `${Math.round(((dispHoje.get('M') ?? 0) / totalAtivo) * 100)}% da frota parada`
              : 'Status de hoje'}
          </span>
        </div>

        {/* Mob + Desmob unificados */}
        <div className="bg-white rounded-2xl border border-l-4 border-l-brand border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Frota em Campo</span>
          <div className="flex items-end gap-2">
            <span className="text-[28px] font-bold text-gray-900 leading-none">{mobilizadoCount + desmobilizadoCount}</span>
            <span className="text-[12px] text-gray-400 mb-0.5">equip.</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Mobilizados</span>
              <span className="text-[11px] font-bold text-brand">{mobilizadoCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Desmobilizados</span>
              <span className="text-[11px] font-bold text-warning">{desmobilizadoCount}</span>
            </div>
          </div>
        </div>

        {/* Taxa de Ocupação */}
        <div className="bg-white rounded-2xl border border-l-4 border-l-info border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Taxa de Ocupação</span>
          <div className="flex items-end gap-1">
            <span className="text-[28px] font-bold text-gray-900 leading-none">{taxaOcupacao}%</span>
          </div>
          {/* Barra de progresso */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full bg-info transition-all duration-500" style={{ width: `${taxaOcupacao}%` }} />
          </div>
          <span className="text-[11px] text-gray-400">{mobilizadoCount} mobilizados de {totalAtivo}</span>
        </div>

        {/* Receita Mobilizada/mês */}
        <div className="bg-white rounded-2xl border border-l-4 border-l-green-500 border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Receita Mobilizada/mês</span>
          <div className="flex items-end gap-2">
            <span className="text-[22px] font-bold text-gray-900 leading-none">{formatBRL(mobilizadoValor)}</span>
          </div>
          <span className="text-[11px] text-gray-400">
            {mobilizadoCount} equip. mobilizados × valor de locação
          </span>
        </div>
      </div>

      {/* Disponibilidade Hoje */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-400">
            Disponibilidade · Hoje ({format(new Date(), "dd 'de' MMMM", { locale: ptBR })})
          </span>
          {dispHoje.size === 0 && (
            <span className="text-[11px] text-gray-400 italic">Nenhum status registrado hoje</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DISP_STATUS_ORDER.map((s) => {
            const count = dispHoje.get(s) ?? 0;
            const cfg = DISP_STATUS_CONFIG[s];
            return (
              <div key={s} className={cn(
                'flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border',
                cfg.bg, cfg.text,
                count === 0 && 'opacity-30',
              )}>
                <span className="text-[13px] font-bold">{s}</span>
                <span className="text-[11px] opacity-75">{cfg.label}</span>
                <span className="text-[18px] font-bold ml-1">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <DonutChart
              title="Situação (Qtde)"
              segments={[
                { label: 'Mobilizado', value: mobilizadoCount, color: '#16a34a' },
                { label: 'Desmobilizado', value: desmobilizadoCount, color: '#dc2626' },
              ]}
              centerLabel="equip."
              centerValue={String(totalAtivo)}
              selected={chartFilters.situacao}
              onSelect={(v, evt) => handleChartSelect('situacao', v, evt)}
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <DonutChartValue
              title="Situação (R$)"
              segments={[
                { label: 'Mobilizado', value: mobilizadoValor, color: '#16a34a' },
                { label: 'Desmobilizado', value: desmobilizadoValor, color: '#dc2626' },
              ]}
              centerValue={`R$ ${(totalValor / 1000).toFixed(0)}k`}
              selected={chartFilters.situacao}
              onSelect={(v, evt) => handleChartSelect('situacao', v, evt)}
            />
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-5">Equipamento por Obra</p>
          {obraItems.length === 0
            ? <p className="text-[13px] text-gray-400 py-8 text-center">Sem dados</p>
            : <HorizontalBarChart items={obraItems} selected={chartFilters.obra}
                onSelect={(v, evt) => handleChartSelect('obra', v, evt)} />
          }
        </div>
      </div>

      {/* Tabela de registros ativos (Equip. por Obra) */}
      <Card>
        <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Chips de filtros de gráfico */}
            {chartFilters.situacao && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-light text-brand rounded-full text-[12px] font-semibold border border-brand/20">
                <span>Situação: {chartFilters.situacao}</span>
                <button onClick={() => setChartFilters((p) => ({ ...p, situacao: null }))} className="hover:text-brand/60"><X size={12} /></button>
              </div>
            )}
            {chartFilters.obra && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-light text-brand rounded-full text-[12px] font-semibold border border-brand/20">
                <span>Obra: {chartFilters.obra}</span>
                <button onClick={() => setChartFilters((p) => ({ ...p, obra: null }))} className="hover:text-brand/60"><X size={12} /></button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto items-center">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar prefixo, obra, família..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-[34px] pr-3 h-[42px] bg-white rounded-full border border-line outline-none text-[13px] font-medium transition-all focus:border-brand placeholder:text-gray-400 text-gray-900 shadow-sm"
              />
            </div>
            {/* Filtro Obra */}
            <select value={filterObra} onChange={(e) => setFilterObra(e.target.value)}
              className="px-3 py-2 text-[13px] border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 text-gray-600 h-[42px] shadow-sm">
              <option value="">Todas as obras</option>
              {obras.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {/* Filtro Situação */}
            <select value={filterSituacao} onChange={(e) => setFilterSituacao(e.target.value)}
              className="px-3 py-2 text-[13px] border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 text-gray-600 h-[42px] shadow-sm">
              <option value="">Todas as situações</option>
              <option value="Mobilizado">Mobilizado</option>
              <option value="Desmobilizado">Desmobilizado</option>
            </select>
            {/* Filtro Status (Disponibilidade de hoje) */}
            <select value={filterDispStatus} onChange={(e) => setFilterDispStatus(e.target.value as DisponibilidadeStatus | '')}
              className="px-3 py-2 text-[13px] border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 text-gray-600 h-[42px] shadow-sm">
              <option value="">Todos os status</option>
              {DISP_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{s} – {DISP_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <button type="button" onClick={clearFilters} title="Limpar filtros"
              className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white border border-line text-gray-500 hover:bg-surface-muted transition-colors shadow-sm shrink-0">
              <Eraser size={16} />
            </button>
          </div>
        </div>

        {/* Contador */}
        <div className="px-6 py-2 text-[12px] text-gray-400 border-b border-gray-50">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          {hasChartFilter && ' (filtrado pelo gráfico)'}
        </div>

        {registros.loading || eqLoading ? (
          <StateMessage>Carregando…</StateMessage>
        ) : eqError ? (
          <StateMessage>Erro ao carregar equipamentos: {eqError}</StateMessage>
        ) : filtered.length === 0 ? (
          <StateMessage>Nenhum registro encontrado.</StateMessage>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white">
                  {['Prefixo', 'Família', 'Localização', 'Situação', 'Valor Locação', 'Data Mobilização', 'Data Desmobilização', 'Observação'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] border-b border-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => {
                  const eq = eqMap.get(r.prefixo);
                  return (
                    <tr key={r.id} className="hover:bg-brand-light transition-colors">
                      <td className="px-6 py-4 text-[13px] font-medium text-brand">{r.prefixo}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-gray-900">{eq?.familia ?? '—'}</span>
                          <span className="text-[12px] text-gray-400 line-clamp-1">{eq?.descricao ?? ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-gray-700 font-medium">{r.obra || '—'}</td>
                      <td className="px-6 py-4"><SituacaoBadge situacao={r.situacao} /></td>
                      <td className="px-6 py-4 text-[13px] font-medium text-gray-900">
                        {eq?.valorLocacao ? formatBRL(eq.valorLocacao) : '—'}
                      </td>
                      <td className="px-6 py-4 text-[12px] text-gray-500">{formatDate(r.dataMobilizacao)}</td>
                      <td className="px-6 py-4 text-[12px] text-gray-500">{formatDate(r.dataDesmobilizacao)}</td>
                      <td className="px-6 py-4 text-[12px] text-gray-400 max-w-[200px]">
                        <span className="line-clamp-2">{r.observacao || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}
