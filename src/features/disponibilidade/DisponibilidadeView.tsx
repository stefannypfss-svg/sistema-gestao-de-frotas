import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { format, getDaysInMonth, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, X, Clock, AlertTriangle } from 'lucide-react';
import { Equipment, EquipamentoObra, DisponibilidadeRecord, DisponibilidadeStatus, TipoManutencao, SistemaManutencao } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { useDisponibilidadeLazy } from '../../hooks/useDisponibilidadeLazy';
import { fetchUltimosRegistros, fetchUltimoRegistroAntes } from '../../services';
import {
  previewVinculoM,
  reconciliarM,
  definirStatusNaoM,
  salvarHorarioDia,
  liberarApartirDeAmanha,
  eventoSeriaDeletado,
} from '../../services/manutencaoReconciliation';
import { useAuth } from '../../hooks/useAuth';
import { recordChange } from '../../lib/lastChange';
import { PageHeader, Button, FilterSelect, StateMessage } from '../../components/ui';
import { cn } from '../../lib/utils';
import { MaintenancePopoverFlow, MFlowState } from './MaintenancePopoverFlow';
import { EquipmentHistoryDrawer } from './EquipmentHistoryDrawer';

interface Props {
  equipments: Collection<Equipment>;
  equipamentoObra: Collection<EquipamentoObra>;
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

/** Janela do lote único do auto-copy — cobre folgas normais (fim de semana,
 * dias sem abrir o sistema) numa leitura só. Equipamento em silêncio por
 * mais tempo que isso cai pro fallback individual, por equipamento. */
const AUTO_COPY_LOOKBACK_DAYS = 14;

export function DisponibilidadeView({ equipments, equipamentoObra }: Props) {
  const { user } = useAuth();
  const userLabel = user?.displayName || user?.email || 'Sistema';

  const [filterYear, setFilterYear]     = useState(TODAY.getFullYear());
  const [filterMonth, setFilterMonth]   = useState(TODAY.getMonth() + 1);

  // Piso e teto da assinatura = exatamente o mês em tela (não o mês atual —
  // navegar pra um mês passado tem que mover a janela junto). Assinatura sob
  // demanda: abrir esta tela é o gatilho (ver useDisponibilidadeLazy).
  const monthStart = format(new Date(filterYear, filterMonth - 1, 1), 'yyyy-MM-dd');
  const monthEnd   = format(new Date(filterYear, filterMonth, 0), 'yyyy-MM-dd');
  const disponibilidade = useDisponibilidadeLazy(monthStart, monthEnd, userLabel);
  const [filterObra, setFilterObra]     = useState('');
  const [filterFamily, setFilterFamily] = useState('');
  const [filterStatus, setFilterStatus] = useState<DisponibilidadeStatus | ''>('');
  const [editing, setEditing]           = useState<{ prefixo: string; date: string } | null>(null);
  const [hoveredRow, setHoveredRow]     = useState<string | null>(null);
  const [timeDraft, setTimeDraft]       = useState<{ horaInicio: string; horaFim: string }>({ horaInicio: '', horaFim: '' });
  const [autoCopyFailed, setAutoCopyFailed] = useState(false);
  const [mFlow, setMFlow]               = useState<MFlowState>(null);
  const [formTipo, setFormTipo]         = useState<TipoManutencao | null>(null);
  const [formSistema, setFormSistema]   = useState<SistemaManutencao | null>(null);
  const [formNota, setFormNota]         = useState('');
  const [liberarPrompt, setLiberarPrompt] = useState<{ prefixo: string; data: string } | null>(null);
  const [historyDrawer, setHistoryDrawer] = useState<{ prefixo: string; descricao: string } | null>(null);

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

  const fullRecordMap = useMemo(() => {
    const m = new Map<string, DisponibilidadeRecord>();
    disponibilidade.items.forEach((r) => m.set(r.id, r));
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

  /* ── Auto-cópia: preenche do último registro até hoje (uma vez por mount) ─
   * Cobre o buraco de dias sem abrir o sistema — sem isso, uma semana de
   * ausência deixa 7 dias sem status, exatamente os dados que o histórico de
   * manutenção precisa ler. Independente do mês em tela.
   *
   * Custo: 1 leitura em lote (fetchUltimosRegistros, campo único, sem índice
   * composto) resolve a maioria dos equipamentos de uma vez — só quem ficou
   * em silêncio por mais tempo que AUTO_COPY_LOOKBACK_DAYS cai no fallback
   * individual (fetchUltimoRegistroAntes, 1 leitura por equipamento), que
   * deve ser raro. Nunca falha em silêncio: erro loga no console e acende o
   * aviso na tela — sem isso, o preenchimento pode simplesmente parar de
   * rodar e ninguém percebe até faltar dado no histórico de manutenção.
   */
  useEffect(() => {
    if (equipamentoObra.loading) return;
    if (hasCopiedRef.current) return;
    hasCopiedRef.current = true;

    const amanha = format(addDays(TODAY, 1), 'yyyy-MM-dd');
    const desde  = format(subDays(TODAY, AUTO_COPY_LOOKBACK_DAYS), 'yyyy-MM-dd');

    (async () => {
      let ultimosPorPrefixo: Map<string, DisponibilidadeRecord>;
      try {
        ultimosPorPrefixo = await fetchUltimosRegistros(desde, amanha);
      } catch {
        setAutoCopyFailed(true);
        return;
      }

      let houveFalha = false;
      await Promise.all(
        activeRegistros.map(async ({ prefixo }) => {
          try {
            const ultimo = ultimosPorPrefixo.get(prefixo) ?? (await fetchUltimoRegistroAntes(prefixo, amanha));
            if (!ultimo || ultimo.data === TODAY_STR) return;

            for (
              let day = addDays(new Date(ultimo.data + 'T12:00:00'), 1);
              day <= TODAY;
              day = addDays(day, 1)
            ) {
              const dayStr = format(day, 'yyyy-MM-dd');
              await disponibilidade.create({ id: `${prefixo}||${dayStr}`, prefixo, data: dayStr, status: ultimo.status });
            }
          } catch (e) {
            console.error(`[Disponibilidade] auto-copy falhou para ${prefixo} — dias não preenchidos.`, e);
            houveFalha = true;
          }
        }),
      );
      if (houveFalha) setAutoCopyFailed(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipamentoObra.loading]);

  /* ── Fecha popover ao clicar fora ─────────────────────────────── */

  useEffect(() => {
    if (!editing) return;
    function onMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEditing(null);
        setMFlow(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [editing]);

  /* ── Salvar status ─────────────────────────────────────────────── */

  // Clicar em "M": não salva direto — abre o fluxo de vínculo ao evento
  // (novo / continuação / merge / fronteira), resolvido pela reconciliação.
  const handleSelecionarM = useCallback(async (prefixo: string, date: string) => {
    setMFlow({ fase: 'carregando' });
    try {
      const preview = await previewVinculoM(prefixo, date);
      if (preview.tipo === 'novo') {
        setFormTipo(preview.ultimaClassificacao?.tipo ?? null);
        setFormSistema(preview.ultimaClassificacao?.sistema ?? null);
        setFormNota('');
        setMFlow({ fase: 'novo' });
      } else if (preview.tipo === 'continuacao') {
        setMFlow({ fase: 'continuacao', evento: preview.evento });
      } else if (preview.tipo === 'merge_conflito') {
        setMFlow({ fase: 'merge_conflito', sobrevivente: preview.sobrevivente, absorvido: preview.absorvido });
      } else if (preview.tipo === 'fronteira_pertencimento') {
        setMFlow({ fase: 'fronteira', eventos: preview.eventos });
      } else {
        // merge_silencioso: sem diálogo — dias contíguos que sempre foram um evento só
        await reconciliarM({ prefixo, data: date });
        recordChange(userLabel);
        setEditing(null);
        setMFlow(null);
      }
    } catch (e) {
      setMFlow({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao verificar' });
    }
  }, [userLabel]);

  const handleStatusSelect = useCallback(
    async (prefixo: string, date: string, status: DisponibilidadeStatus | null) => {
      if (status === 'M') {
        await handleSelecionarM(prefixo, date);
        return;
      }
      if (status === null) {
        const apagaEvento = await eventoSeriaDeletado(prefixo, date);
        if (apagaEvento) {
          const ok = window.confirm(
            'Este é o único dia registrado desta manutenção — limpar vai apagar a classificação e a nota, que não voltam. Continuar?',
          );
          if (!ok) return;
        }
      }
      setEditing(null);
      setMFlow(null);
      try {
        await definirStatusNaoM(prefixo, date, status);
        recordChange(userLabel);
      } catch (e) {
        console.error('[Disponibilidade] falha ao gravar status:', e);
        window.alert('Não foi possível salvar o status. Veja o console para detalhes.');
      }
    },
    [handleSelecionarM, userLabel],
  );

  const confirmarNovoEvento = useCallback(async (prefixo: string, date: string) => {
    try {
      await reconciliarM({
        prefixo,
        data: date,
        horaInicio: timeDraft.horaInicio || undefined,
        novaClassificacao: { tipo: formTipo, sistema: formSistema, nota: formNota.trim() || null },
      });
      recordChange(userLabel);
      setEditing(null);
      setMFlow(null);
    } catch (e) {
      console.error('[Disponibilidade] falha ao criar evento de manutenção:', e);
      setMFlow({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao salvar' });
    }
  }, [formTipo, formSistema, formNota, timeDraft, userLabel]);

  const confirmarContinuacao = useCallback(async (prefixo: string, date: string) => {
    try {
      await reconciliarM({ prefixo, data: date, horaInicio: timeDraft.horaInicio || undefined });
      recordChange(userLabel);
      setEditing(null);
      setMFlow(null);
    } catch (e) {
      console.error('[Disponibilidade] falha ao confirmar continuação:', e);
      setMFlow({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao salvar' });
    }
  }, [timeDraft, userLabel]);

  const recusarContinuacao = useCallback(() => {
    setFormTipo(null);
    setFormSistema(null);
    setFormNota('');
    setMFlow((f) => (f && f.fase === 'continuacao' ? { fase: 'continuacao_nova', evento: f.evento } : f));
  }, []);

  const confirmarNovaOcorrencia = useCallback(async (prefixo: string, date: string) => {
    try {
      await reconciliarM({
        prefixo,
        data: date,
        horaInicio: timeDraft.horaInicio || undefined,
        forcarNovaOcorrencia: true,
        novaClassificacao: { tipo: formTipo, sistema: formSistema, nota: formNota.trim() || null },
      });
      recordChange(userLabel);
      setEditing(null);
      setMFlow(null);
    } catch (e) {
      console.error('[Disponibilidade] falha ao criar nova ocorrência:', e);
      setMFlow({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao salvar' });
    }
  }, [formTipo, formSistema, formNota, timeDraft, userLabel]);

  const confirmarMerge = useCallback(async (prefixo: string, date: string, manterSobrevivente: boolean) => {
    try {
      await reconciliarM({ prefixo, data: date, manterClassificacaoDoSobrevivente: manterSobrevivente });
      recordChange(userLabel);
      setEditing(null);
      setMFlow(null);
    } catch (e) {
      console.error('[Disponibilidade] falha ao confirmar merge:', e);
      setMFlow({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao salvar' });
    }
  }, [userLabel]);

  const confirmarFronteira = useCallback(async (prefixo: string, date: string, eventoId: string) => {
    try {
      await reconciliarM({ prefixo, data: date, pertenceAoEventoId: eventoId });
      recordChange(userLabel);
      setEditing(null);
      setMFlow(null);
    } catch (e) {
      console.error('[Disponibilidade] falha ao confirmar pertencimento:', e);
      setMFlow({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao salvar' });
    }
  }, [userLabel]);

  const handleSaveTime = useCallback(
    async (prefixo: string, date: string) => {
      try {
        const resultado = await salvarHorarioDia(prefixo, date, timeDraft.horaInicio || undefined, timeDraft.horaFim || undefined);
        recordChange(userLabel);
        setEditing(null);
        if (timeDraft.horaFim && resultado.ehFimDoEvento) {
          setLiberarPrompt({ prefixo, data: date });
        }
      } catch (e) {
        console.error('[Disponibilidade] falha ao salvar horário:', e);
        window.alert('Não foi possível salvar o horário. Veja o console para detalhes.');
      }
    },
    [timeDraft, userLabel],
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

      {autoCopyFailed && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-[13px]">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            O preenchimento automático de dias falhou para um ou mais equipamentos — dados podem estar
            desatualizados. Veja o console do navegador; se persistir, confira se o índice do Firestore
            (prefixo + data) foi criado.
          </span>
        </div>
      )}

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
                  const eq         = eqMap.get(r.prefixo);
                  const isRowActive = hoveredRow === r.prefixo || editing?.prefixo === r.prefixo;

                  return (
                    <tr
                      key={r.prefixo}
                      onMouseEnter={() => setHoveredRow(r.prefixo)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* Prefixo — clique abre o histórico de manutenção */}
                      <td
                        onClick={() => setHistoryDrawer({ prefixo: r.prefixo, descricao: eq?.descricao ?? r.prefixo })}
                        className={cn(
                          'sticky left-0 z-10 px-3 py-1 border-r border-gray-100 w-[88px] transition-colors cursor-pointer',
                          isRowActive ? 'bg-brand/10' : 'bg-white',
                        )}
                      >
                        <span className="text-[11px] font-bold text-brand hover:underline">{r.prefixo}</span>
                      </td>
                      {/* Descrição — clique abre o histórico de manutenção */}
                      <td
                        onClick={() => setHistoryDrawer({ prefixo: r.prefixo, descricao: eq?.descricao ?? r.prefixo })}
                        className={cn(
                          'sticky left-[88px] z-10 px-3 py-1 border-r border-gray-100 w-[200px] max-w-[200px] transition-colors cursor-pointer',
                          isRowActive ? 'bg-brand/10' : 'bg-white',
                        )}
                      >
                        <span className="text-[11px] text-gray-700 line-clamp-1 leading-snug hover:underline">
                          {eq?.descricao ?? r.prefixo}
                        </span>
                      </td>
                      {/* Células de dia */}
                      {days.map((d) => {
                        const id        = `${r.prefixo}||${d}`;
                        const status    = recordMap.get(id);
                        const record    = fullRecordMap.get(id);
                        const cfg       = status ? STATUS_CONFIG[status] : null;
                        const isToday   = d === TODAY_STR;
                        const isEditing = editing?.prefixo === r.prefixo && editing?.date === d;
                        const hasHorario = status === 'M' && (record?.horaInicio || record?.horaFim);

                        return (
                          <td
                            key={d}
                            className={cn(
                              'w-[46px] min-w-[46px] p-0.5 border-l border-gray-50 relative transition-colors',
                              isRowActive && !isToday && 'bg-brand/5',
                              isToday && 'bg-brand/[0.08]',
                            )}
                          >
                            <button
                              onClick={() => {
                                setMFlow(null);
                                if (isEditing) {
                                  setEditing(null);
                                } else {
                                  setTimeDraft({
                                    horaInicio: record?.horaInicio ?? '',
                                    horaFim: record?.horaFim ?? '',
                                  });
                                  setEditing({ prefixo: r.prefixo, date: d });
                                }
                              }}
                              title={
                                status === 'M'
                                  ? `Manutenção${record?.horaInicio ? ` · ${record.horaInicio}` : ''}${record?.horaFim ? `–${record.horaFim}` : ''}`
                                  : undefined
                              }
                              className={cn(
                                'w-full h-7 flex items-center justify-center gap-0.5 text-[10px] font-bold rounded transition-all hover:opacity-75',
                                cfg ? [cfg.bg, cfg.text] : 'text-transparent hover:bg-gray-100',
                              )}
                            >
                              {status ?? '·'}
                              {hasHorario && <Clock size={8} className="shrink-0" />}
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

                                {mFlow ? (
                                  <MaintenancePopoverFlow
                                    flow={mFlow}
                                    formTipo={formTipo}
                                    formSistema={formSistema}
                                    formNota={formNota}
                                    setFormTipo={setFormTipo}
                                    setFormSistema={setFormSistema}
                                    setFormNota={setFormNota}
                                    timeDraft={timeDraft}
                                    setTimeDraft={setTimeDraft}
                                    onConfirmarNovo={() => confirmarNovoEvento(r.prefixo, d)}
                                    onConfirmarContinuacao={() => confirmarContinuacao(r.prefixo, d)}
                                    onRecusarContinuacao={recusarContinuacao}
                                    onConfirmarNovaOcorrencia={() => confirmarNovaOcorrencia(r.prefixo, d)}
                                    onConfirmarMerge={(manterSobrevivente) => confirmarMerge(r.prefixo, d, manterSobrevivente)}
                                    onConfirmarFronteira={(eventoId) => confirmarFronteira(r.prefixo, d, eventoId)}
                                  />
                                ) : status === 'M' && (
                                  <div className="mt-1.5 pt-1.5 border-t border-gray-100 px-1">
                                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                                      <Clock size={10} /> Horário da manutenção
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="time"
                                        value={timeDraft.horaInicio}
                                        onChange={(e) => setTimeDraft((t) => ({ ...t, horaInicio: e.target.value }))}
                                        className="w-full h-7 px-1.5 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:border-brand"
                                      />
                                      <span className="text-gray-300 text-[11px]">–</span>
                                      <input
                                        type="time"
                                        value={timeDraft.horaFim}
                                        onChange={(e) => setTimeDraft((t) => ({ ...t, horaFim: e.target.value }))}
                                        className="w-full h-7 px-1.5 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:border-brand"
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleSaveTime(r.prefixo, d)}
                                      className="w-full mt-1.5 h-7 flex items-center justify-center text-[11px] font-medium text-white bg-brand rounded-md hover:opacity-90 transition-opacity"
                                    >
                                      Salvar horário
                                    </button>
                                  </div>
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

      {liberarPrompt && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
          onClick={() => setLiberarPrompt(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] text-gray-700 mb-4">Liberar o equipamento a partir de amanhã?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setLiberarPrompt(null)}
                className="px-3 py-1.5 text-[12px] text-gray-500 hover:bg-gray-50 rounded-lg"
              >
                Agora não
              </button>
              <button
                onClick={async () => {
                  await liberarApartirDeAmanha(liberarPrompt.prefixo, liberarPrompt.data);
                  recordChange(userLabel);
                  setLiberarPrompt(null);
                }}
                className="px-3 py-1.5 text-[12px] font-medium text-white bg-brand rounded-lg hover:opacity-90"
              >
                Sim, liberar
              </button>
            </div>
          </div>
        </div>
      )}

      {historyDrawer && (
        <EquipmentHistoryDrawer
          prefixo={historyDrawer.prefixo}
          descricao={historyDrawer.descricao}
          onClose={() => setHistoryDrawer(null)}
        />
      )}
    </div>
  );
}
