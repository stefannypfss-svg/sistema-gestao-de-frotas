import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { format, getDaysInMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, X } from 'lucide-react';
import { Equipment, EquipamentoObra, DisponibilidadeRecord, DisponibilidadeStatus } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { PageHeader, Button, FilterSelect, StateMessage } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Props {
  equipments: Collection<Equipment>;
  equipamentoObra: Collection<EquipamentoObra>;
  disponibilidade: Collection<DisponibilidadeRecord>;
}

const STATUS_ORDER: DisponibilidadeStatus[] = ['EO', 'D', 'M', 'PL', 'AO', 'UG', 'V'];

const STATUS_CONFIG: Record<DisponibilidadeStatus, { label: string; bg: string; text: string; ring: string }> = {
  EO: { label: 'Em Operação',     bg: 'bg-green-100',   text: 'text-green-800',   ring: 'ring-green-400' },
  D:  { label: 'Disponível',      bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-400' },
  M:  { label: 'Manutenção',      bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-400' },
  PL: { label: 'Proc. Liberação', bg: 'bg-sky-100',     text: 'text-sky-700',     ring: 'ring-sky-400' },
  AO: { label: 'Apoio Oficina',   bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-400' },
  UG: { label: 'Uso Gerencial',   bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-400' },
  V:  { label: 'Venda',           bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-400' },
};

const TODAY = new Date();
const TODAY_STR = format(TODAY, 'yyyy-MM-dd');
const YESTERDAY_STR = format(subDays(TODAY, 1), 'yyyy-MM-dd');

export function DisponibilidadeView({ equipments, equipamentoObra, disponibilidade }: Props) {
  const [filterYear, setFilterYear]     = useState(TODAY.getFullYear());
  const [filterMonth, setFilterMonth]   = useState(TODAY.getMonth() + 1);
  const [filterObra, setFilterObra]     = useState('');
  const [filterFamily, setFilterFamily] = useState('');
  const [filterStatus, setFilterStatus] = useState<DisponibilidadeStatus | ''>('');
  const [editing, setEditing]           = useState<{ prefixo: string; date: string } | null>(null);

  const hasCopiedRef = useRef(false);
  const popoverRef   = useRef<HTMLDivElement>(null);

  /* ── Dados derivados ──────────────────────────────────────────── */

  const activeRegistros = useMemo(
    () => equipamentoObra.items.filter((r) => !r.dataEnvio),
    [equipamentoObra.items],
  );

  const eqMap = useMemo(() => {
    const m = new Map<string, Equipment>();
    equipments.items.forEach((e) => m.set(e.prefixo, e));
    return m;
  }, [equipments.items]);

  const obras = useMemo(
    () => [...new Set(activeRegistros.map((r) => r.obra))].sort(),
    [activeRegistros],
  );

  const families = useMemo(() => {
    const s = new Set<string>();
    activeRegistros.forEach((r) => {
      const f = eqMap.get(r.prefixo)?.familia;
      if (f) s.add(f);
    });
    return [...s].sort();
  }, [activeRegistros, eqMap]);

  const days = useMemo(() => {
    const count = getDaysInMonth(new Date(filterYear, filterMonth - 1));
    return Array.from({ length: count }, (_, i) =>
      format(new Date(filterYear, filterMonth - 1, i + 1), 'yyyy-MM-dd'),
    );
  }, [filterYear, filterMonth]);

  const recordMap = useMemo(() => {
    const m = new Map<string, DisponibilidadeStatus>();
    disponibilidade.items.forEach((r) => m.set(r.id, r.status));
    return m;
  }, [disponibilidade.items]);

  const filteredRows = useMemo(() => {
    return activeRegistros
      .filter((r) => !filterObra || r.obra === filterObra)
      .filter((r) => !filterFamily || eqMap.get(r.prefixo)?.familia === filterFamily)
      .filter((r) => {
        if (!filterStatus) return true;
        return days.some((d) => recordMap.get(`${r.prefixo}||${d}`) === filterStatus);
      })
      .sort((a, b) => a.prefixo.localeCompare(b.prefixo));
  }, [activeRegistros, filterObra, filterFamily, filterStatus, days, recordMap, eqMap]);

  /* ── Auto-cópia: hoje = ontem (apenas mês atual, uma vez por mount) ─ */

  useEffect(() => {
    if (disponibilidade.loading) return;
    if (hasCopiedRef.current) return;
    hasCopiedRef.current = true;

    const isCurrentMonth =
      filterYear === TODAY.getFullYear() && filterMonth === TODAY.getMonth() + 1;
    if (!isCurrentMonth) return;

    activeRegistros.forEach(({ prefixo }) => {
      const todayId    = `${prefixo}||${TODAY_STR}`;
      const yesterdayStatus = recordMap.get(`${prefixo}||${YESTERDAY_STR}`);
      if (!recordMap.has(todayId) && yesterdayStatus) {
        disponibilidade
          .create({ id: todayId, prefixo, data: TODAY_STR, status: yesterdayStatus })
          .catch(() => null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disponibilidade.loading]);

  /* ── Fecha popover ao clicar fora ─────────────────────────────── */

  useEffect(() => {
    if (!editing) return;
    function onMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEditing(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [editing]);

  /* ── Salvar status ─────────────────────────────────────────────── */

  const handleStatusSelect = useCallback(
    async (prefixo: string, date: string, status: DisponibilidadeStatus | null) => {
      const id = `${prefixo}||${date}`;
      setEditing(null);
      if (status === null) {
        if (recordMap.has(id)) await disponibilidade.remove(id);
      } else {
        const record: DisponibilidadeRecord = { id, prefixo, data: date, status };
        if (recordMap.has(id)) {
          await disponibilidade.update(id, record);
        } else {
          await disponibilidade.create(record);
        }
      }
    },
    [recordMap, disponibilidade],
  );

  /* ── Export CSV ───────────────────────────────────────────────── */

  const exportCSV = () => {
    const mesLabel = format(new Date(filterYear, filterMonth - 1, 1), 'MMMM_yyyy', { locale: ptBR });
    const headers  = ['Prefixo', 'Equipamento', 'Obra', ...days.map((d) => format(new Date(d + 'T12:00:00'), 'dd/MM'))];
    const dataRows = filteredRows.map((r) => [
      r.prefixo,
      eqMap.get(r.prefixo)?.descricao ?? '',
      r.obra,
      ...days.map((d) => recordMap.get(`${r.prefixo}||${d}`) ?? ''),
    ]);
    const csv  = [headers, ...dataRows].map((row) => row.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `disponibilidade_${mesLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Opções de filtro de ano/mês ──────────────────────────────── */

  const yearOptions  = [TODAY.getFullYear() - 1, TODAY.getFullYear(), TODAY.getFullYear() + 1];
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }),
  }));

  const isLoading = disponibilidade.loading || equipments.loading || equipamentoObra.loading;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Disponibilidade"
        description="Status diário da frota por equipamento"
        action={
          <Button onClick={exportCSV}>
            <Download size={16} /> Exportar CSV
          </Button>
        }
      />

      {/* Legenda */}
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <span
              key={s}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border',
                cfg.bg, cfg.text,
              )}
            >
              <span className="font-bold">{s}</span>
              <span className="opacity-75">{cfg.label}</span>
            </span>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-wrap gap-4 items-end shadow-sm">
        {/* Ano */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Ano</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="h-[38px] px-3 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Mês */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Mês</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="h-[38px] px-3 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand capitalize"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Obra */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Obra / Localização</label>
          <FilterSelect
            value={filterObra}
            onChange={setFilterObra}
            placeholder="Todas"
            options={obras.map((o) => ({ value: o, label: o }))}
          />
        </div>

        {/* Família */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Família</label>
          <FilterSelect
            value={filterFamily}
            onChange={setFilterFamily}
            placeholder="Todas"
            options={families.map((f) => ({ value: f, label: f }))}
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Status</label>
          <FilterSelect
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as DisponibilidadeStatus | '')}
            placeholder="Todos"
            options={STATUS_ORDER.map((s) => ({ value: s, label: `${s} – ${STATUS_CONFIG[s].label}` }))}
          />
        </div>

        {(filterObra || filterFamily || filterStatus) && (
          <button
            onClick={() => { setFilterObra(''); setFilterFamily(''); setFilterStatus(''); }}
            className="h-[38px] px-3 flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <StateMessage>Carregando…</StateMessage>
      ) : filteredRows.length === 0 ? (
        <StateMessage>Nenhum equipamento ativo encontrado.</StateMessage>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="text-left border-collapse"
              style={{ minWidth: `${88 + 200 + days.length * 46}px` }}
            >
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* Coluna ATIVO */}
                  <th className="sticky left-0 z-20 bg-gray-50 px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-[88px] min-w-[88px]">
                    Ativo
                  </th>
                  {/* Coluna EQUIPAMENTO */}
                  <th className="sticky left-[88px] z-20 bg-gray-50 px-3 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-[200px] min-w-[200px]">
                    Equipamento
                  </th>
                  {/* Colunas de dia */}
                  {days.map((d) => {
                    const isToday = d === TODAY_STR;
                    const dayNum  = format(new Date(d + 'T12:00:00'), 'dd');
                    return (
                      <th
                        key={d}
                        className={cn(
                          'px-0 py-3 text-[10px] font-semibold text-gray-500 uppercase text-center w-[46px] min-w-[46px] border-l border-gray-100',
                          isToday && 'bg-brand/5 text-brand',
                        )}
                      >
                        {dayNum}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((r) => {
                  const eq = eqMap.get(r.prefixo);
                  return (
                    <tr key={r.prefixo} className="hover:bg-gray-50/50 group">
                      {/* Prefixo */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 px-3 py-1 border-r border-gray-100 w-[88px]">
                        <span className="text-[11px] font-bold text-brand">{r.prefixo}</span>
                      </td>
                      {/* Descrição */}
                      <td className="sticky left-[88px] z-10 bg-white group-hover:bg-gray-50/50 px-3 py-1 border-r border-gray-100 w-[200px] max-w-[200px]">
                        <span className="text-[11px] text-gray-700 line-clamp-1 leading-snug">
                          {eq?.descricao ?? r.prefixo}
                        </span>
                      </td>
                      {/* Células de dia */}
                      {days.map((d) => {
                        const status    = recordMap.get(`${r.prefixo}||${d}`);
                        const cfg       = status ? STATUS_CONFIG[status] : null;
                        const isToday   = d === TODAY_STR;
                        const isEditing = editing?.prefixo === r.prefixo && editing?.date === d;

                        return (
                          <td
                            key={d}
                            className={cn(
                              'w-[46px] min-w-[46px] p-0.5 border-l border-gray-50 relative',
                              isToday && 'bg-brand/[0.03]',
                            )}
                          >
                            <button
                              onClick={() => setEditing(isEditing ? null : { prefixo: r.prefixo, date: d })}
                              className={cn(
                                'w-full h-7 flex items-center justify-center text-[10px] font-bold rounded transition-all hover:opacity-75',
                                cfg ? [cfg.bg, cfg.text] : 'text-transparent hover:bg-gray-100',
                              )}
                            >
                              {status ?? '·'}
                            </button>

                            {/* Popover de seleção */}
                            {isEditing && (
                              <div
                                ref={popoverRef}
                                className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 min-w-[172px]"
                              >
                                {STATUS_ORDER.map((s) => {
                                  const sc = STATUS_CONFIG[s];
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => handleStatusSelect(r.prefixo, d, s)}
                                      className={cn(
                                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-90 text-left',
                                        sc.bg, sc.text,
                                        status === s && `ring-1 ring-inset ${sc.ring}`,
                                      )}
                                    >
                                      <span className="font-bold w-7 shrink-0">{s}</span>
                                      <span className="font-normal opacity-80 text-[11px]">{sc.label}</span>
                                    </button>
                                  );
                                })}
                                {status && (
                                  <button
                                    onClick={() => handleStatusSelect(r.prefixo, d, null)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-0.5 rounded-lg text-[11px] text-gray-400 hover:bg-gray-50 border-t border-gray-100 transition-colors"
                                  >
                                    <X size={11} /> Limpar
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
