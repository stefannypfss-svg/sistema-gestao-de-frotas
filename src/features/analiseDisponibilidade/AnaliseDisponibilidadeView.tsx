import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Info, Check } from 'lucide-react';
import { Equipment, EquipamentoObra, DisponibilidadeStatus, EventoManutencao, SituacaoEquipamento } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { useDisponibilidadeLazy } from '../../hooks/useDisponibilidadeLazy';
import { eventoManutencaoRepository } from '../../services';
import { construirInfoExclusao, classificarDiaM } from '../../domain/forecast';
import { PageHeader, StateMessage, FilterSelect, StatCard } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Props {
  equipments: Collection<Equipment>;
  equipamentoObra: Collection<EquipamentoObra>;
}

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);
const TODAY = new Date();

const MONTH_LABELS = MESES.map((mes) => format(new Date(2024, mes - 1, 1), 'MMMM', { locale: ptBR }));

interface MonthStats {
  diasComRegistro: number;
  diasOk: number;
  diasAvaria: number;
  diasPreventivaCarencia: number;
  /** Soma de diasEfetivaClassificada + diasNaoClassificado — ambos descontam igual, só mudam de "balde" pra exibição. */
  diasEfetiva: number;
  /** M efetivo com tipo confirmado (Corretiva, Revisão, Preventiva fora da carência). */
  diasEfetivaClassificada: number;
  /** M efetivo sem `tipo` registrado — dado legado nunca classificado, não necessariamente manutenção por estado. */
  diasNaoClassificado: number;
}

function emptyStats(): MonthStats {
  return {
    diasComRegistro: 0, diasOk: 0, diasAvaria: 0, diasPreventivaCarencia: 0,
    diasEfetiva: 0, diasEfetivaClassificada: 0, diasNaoClassificado: 0,
  };
}

function somarStats(a: MonthStats, b: MonthStats): MonthStats {
  return {
    diasComRegistro: a.diasComRegistro + b.diasComRegistro,
    diasOk: a.diasOk + b.diasOk,
    diasAvaria: a.diasAvaria + b.diasAvaria,
    diasPreventivaCarencia: a.diasPreventivaCarencia + b.diasPreventivaCarencia,
    diasEfetiva: a.diasEfetiva + b.diasEfetiva,
    diasEfetivaClassificada: a.diasEfetivaClassificada + b.diasEfetivaClassificada,
    diasNaoClassificado: a.diasNaoClassificado + b.diasNaoClassificado,
  };
}

/** Disponibilidade mecânica "sem avaria" — avaria nunca desconta (é imprevisto, não falta de manutenção), e a carência da Preventiva (até 3 dias) também não desconta. */
function pctSemAvaria(stats: MonthStats): number | null {
  return stats.diasComRegistro > 0 ? Math.round((stats.diasOk / stats.diasComRegistro) * 100) : null;
}

/** Disponibilidade "com avaria" — avaria passa a contar como indisponibilidade também, pra mostrar o impacto real no uptime. */
function pctComAvaria(stats: MonthStats): number | null {
  return stats.diasComRegistro > 0 ? Math.round(((stats.diasOk - stats.diasAvaria) / stats.diasComRegistro) * 100) : null;
}

/** Disponibilidade "com avaria e preventiva" — além da avaria, a carência da Preventiva também passa a descontar. Só EO/AO/UG contam como disponível; a mais estrita das três. */
function pctComAvariaEPreventiva(stats: MonthStats): number | null {
  return stats.diasComRegistro > 0
    ? Math.round(((stats.diasOk - stats.diasAvaria - stats.diasPreventivaCarencia) / stats.diasComRegistro) * 100)
    : null;
}

function totalM(stats: MonthStats): number {
  return stats.diasAvaria + stats.diasPreventivaCarencia + stats.diasEfetiva;
}

/** Motivo predominante da parada — o maior entre os 4 baldes de dia M, pro ranking de prefixos críticos. */
function motivoPredominante(stats: MonthStats): { label: string; dias: number } {
  const candidatos: [string, number][] = [
    ['Avaria', stats.diasAvaria],
    ['Preventiva (carência)', stats.diasPreventivaCarencia],
    ['Manutenção confirmada', stats.diasEfetivaClassificada],
    ['Não classificado', stats.diasNaoClassificado],
  ];
  candidatos.sort((a, b) => b[1] - a[1]);
  const [label, dias] = candidatos[0];
  // Os 4 baldes são todos de dia M — se o maior deles é 0, não houve
  // manutenção nenhuma no período (o `%` baixo é por outro motivo, ex.:
  // dias D/PL/V). Sem essa guarda, `.sort()` não reordena empate e o
  // primeiro da lista ("Avaria") vencia por padrão mesmo com 0 dia.
  if (dias === 0) return { label: 'Sem manutenção no período', dias: 0 };
  return { label, dias };
}

/** Nota mais recente de algum evento de manutenção do prefixo no ano em tela — contexto opcional, só quando existe. */
function notaRecente(prefixo: string, eventos: EventoManutencao[], ano: number): string | null {
  const anoStr = String(ano);
  const comNota = eventos
    .filter((e) => e.prefixo === prefixo && e.nota && (e.dataInicio.startsWith(anoStr) || e.dataFim.startsWith(anoStr)))
    .sort((a, b) => b.dataFim.localeCompare(a.dataFim));
  return comNota[0]?.nota ?? null;
}

export function AnaliseDisponibilidadeView({ equipments, equipamentoObra }: Props) {
  const [ano, setAno] = useState(TODAY.getFullYear());
  const [filterMeses, setFilterMeses] = useState<Set<number>>(new Set());
  const [mesPickerOpen, setMesPickerOpen] = useState(false);
  const mesPickerRef = useRef<HTMLDivElement>(null);
  const [filterObras, setFilterObras] = useState<Set<string>>(new Set());
  const [filterGruposEquipamento, setFilterGruposEquipamento] = useState<Set<string>>(new Set());
  const [filterSituacao, setFilterSituacao] = useState<SituacaoEquipamento | ''>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [cellPopover, setCellPopover] = useState<string | null>(null); // `${scopeKey}||${mes}`
  const popoverRef = useRef<HTMLDivElement>(null);
  const [highlightPrefixo, setHighlightPrefixo] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const yearOptions = [TODAY.getFullYear() - 1, TODAY.getFullYear(), TODAY.getFullYear() + 1];
  const mesesExibidos = filterMeses.size > 0 ? MESES.filter((m) => filterMeses.has(m)) : MESES;

  const yearStart = `${ano}-01-01`;
  const yearEnd = `${ano}-12-31`;
  const disponibilidade = useDisponibilidadeLazy(yearStart, yearEnd);

  // Leitura pontual da coleção inteira de eventos — precisamos do `tipo`
  // (Avaria/Preventiva/…) de qualquer evento vinculado, mesmo um que
  // começou num ano anterior e ainda está aberto (mesmo padrão já usado na
  // Previsão de Receitas e na Disponibilidade).
  const [eventosManutencao, setEventosManutencao] = useState<EventoManutencao[]>([]);
  useEffect(() => {
    let cancelado = false;
    eventoManutencaoRepository.list().then((todos) => {
      if (!cancelado) setEventosManutencao(todos);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const recordMap = useMemo(() => {
    const m = new Map<string, DisponibilidadeStatus>();
    disponibilidade.items.forEach((r) => m.set(r.id, r.status));
    return m;
  }, [disponibilidade.items]);

  const infoExclusao = useMemo(
    () => construirInfoExclusao(disponibilidade.items, eventosManutencao),
    [disponibilidade.items, eventosManutencao],
  );

  // `construirInfoExclusao` propaga a classificação de um dia vinculado a
  // evento pro bloco inteiro de dias M calendário-contíguos ao redor dele —
  // certo pro desconto de receita (um bloco só precisa de 1 dia linkado pra
  // saber se desconta), mas errado pro Panorama: aqui "Manutenção
  // confirmada" tem que significar que O DIA tem evento próprio, não que
  // algum vizinho tem. Sem isso, um evento de 2 dias registrado perto de 28
  // dias M nunca fechados em evento nenhum inflava a contagem de
  // "confirmada" pros 30 dias inteiros.
  const tipoProprioPorDia = useMemo(() => {
    const eventosPorId = new Map(eventosManutencao.map((e) => [e.id, e]));
    const m = new Map<string, string | null>();
    disponibilidade.items.forEach((r) => {
      if (r.status !== 'M') return;
      const evento = r.eventoId ? eventosPorId.get(r.eventoId) : undefined;
      m.set(`${r.prefixo}||${r.data}`, evento?.tipo ?? null);
    });
    return m;
  }, [disponibilidade.items, eventosManutencao]);

  const eqMap = useMemo(() => {
    const m = new Map<string, Equipment>();
    equipments.items.forEach((e) => m.set(e.prefixo, e));
    return m;
  }, [equipments.items]);

  const activeRegistros = useMemo(
    () => equipamentoObra.items.filter((r) => !r.dataEnvio),
    [equipamentoObra.items],
  );

  const obras = useMemo(
    () => [...new Set(activeRegistros.map((r) => r.obra))].sort(),
    [activeRegistros],
  );

  const gruposEquipamento = useMemo(
    () => [...new Set(equipments.items.map((e) => e.grupoEquipamento).filter(Boolean))].sort(),
    [equipments.items],
  );

  const filteredPrefixos = useMemo(
    () => activeRegistros
      .filter((r) => filterObras.size === 0 || filterObras.has(r.obra))
      .filter((r) => !filterSituacao || r.situacao === filterSituacao)
      .filter((r) => filterGruposEquipamento.size === 0 || filterGruposEquipamento.has(eqMap.get(r.prefixo)?.grupoEquipamento ?? ''))
      .map((r) => r.prefixo)
      .sort((a, b) => a.localeCompare(b)),
    [activeRegistros, filterObras, filterSituacao, filterGruposEquipamento, eqMap],
  );

  /* ── Estatísticas por equipamento × mês (os 12 meses, sempre — o filtro
     de Mês só decide o que é renderizado) ────────────────────────────── */
  const statsPorPrefixo = useMemo(() => {
    const m = new Map<string, Map<number, MonthStats>>();
    filteredPrefixos.forEach((prefixo) => {
      const porMes = new Map<number, MonthStats>();
      MESES.forEach((mes) => {
        const diasNoMes = getDaysInMonth(new Date(ano, mes - 1));
        const stats = emptyStats();
        for (let dia = 1; dia <= diasNoMes; dia++) {
          const dataStr = format(new Date(ano, mes - 1, dia), 'yyyy-MM-dd');
          const chave = `${prefixo}||${dataStr}`;
          const status = recordMap.get(chave);
          if (!status) continue;
          stats.diasComRegistro++;
          if (status === 'EO' || status === 'AO' || status === 'UG') {
            stats.diasOk++;
          } else if (status === 'M') {
            const tipo = tipoProprioPorDia.get(chave) ?? null;
            const diaBloco = infoExclusao.diaBlocoPorDia.get(chave) ?? 1;
            const classe = classificarDiaM(tipo, diaBloco);
            if (classe === 'avaria') {
              stats.diasAvaria++;
              stats.diasOk++;
            } else if (classe === 'preventiva_carencia') {
              stats.diasPreventivaCarencia++;
              stats.diasOk++;
            } else {
              stats.diasEfetiva++;
              // `tipo === null` = dia M sem classificação nenhuma (dado legado do
              // backfill, nunca passado pelo popover) — descontamos igual, mas
              // separamos pra não aparentar que é manutenção por estado confirmada.
              if (tipo === null) {
                stats.diasNaoClassificado++;
              } else {
                stats.diasEfetivaClassificada++;
              }
            }
          }
        }
        porMes.set(mes, stats);
      });
      m.set(prefixo, porMes);
    });
    return m;
  }, [filteredPrefixos, ano, recordMap, infoExclusao, tipoProprioPorDia]);

  /* ── Agrupamento por família ──────────────────────────────────────── */
  const grupos = useMemo(() => {
    const porGrupo = new Map<string, string[]>();
    filteredPrefixos.forEach((prefixo) => {
      const grupo = eqMap.get(prefixo)?.familia || 'Sem família';
      const lista = porGrupo.get(grupo) ?? [];
      lista.push(prefixo);
      porGrupo.set(grupo, lista);
    });
    return [...porGrupo.entries()]
      .map(([grupo, prefixos]) => ({ grupo, prefixos: prefixos.sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo, 'pt-BR'));
  }, [filteredPrefixos, eqMap]);

  function statsDoGrupo(prefixos: string[], mes: number): MonthStats {
    return prefixos.reduce((acc, p) => somarStats(acc, statsPorPrefixo.get(p)?.get(mes) ?? emptyStats()), emptyStats());
  }

  // Total agregado (todos os equipamentos filtrados × meses em tela) — o
  // resumo de topo que mostra de cara quanto é Avaria, Preventiva e
  // Manutenção efetiva, antes de qualquer clique numa célula.
  const totalGeral = useMemo(() => {
    let acc = emptyStats();
    filteredPrefixos.forEach((prefixo) => {
      mesesExibidos.forEach((mes) => {
        const s = statsPorPrefixo.get(prefixo)?.get(mes);
        if (s) acc = somarStats(acc, s);
      });
    });
    return acc;
  }, [filteredPrefixos, mesesExibidos, statsPorPrefixo]);

  // Ranking dos piores prefixos do período em tela — pela disponibilidade
  // mecânica (S/Av), que já é a métrica em destaque na grade abaixo.
  const prefixosCriticos = useMemo(() => {
    return filteredPrefixos
      .map((prefixo) => {
        let stats = emptyStats();
        mesesExibidos.forEach((mes) => {
          const s = statsPorPrefixo.get(prefixo)?.get(mes);
          if (s) stats = somarStats(stats, s);
        });
        return { prefixo, stats };
      })
      // Exige pelo menos 1 dia de manutenção de verdade — "crítico" aqui é
      // sobre parada por manutenção, não qualquer % baixo (ex.: dias D
      // só de disponível-parado não contam pra esse ranking).
      .filter(({ stats }) => totalM(stats) > 0)
      .map(({ prefixo, stats }) => ({
        prefixo,
        stats,
        pct: pctSemAvaria(stats) ?? 0,
        motivo: motivoPredominante(stats),
        nota: notaRecente(prefixo, eventosManutencao, ano),
      }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 6);
  }, [filteredPrefixos, mesesExibidos, statsPorPrefixo, eventosManutencao, ano]);

  // As 3 réguas (S/Av, C/Av, C/Prev) agregadas por família, pro gráfico de
  // "dumbbell" — mesmo agrupamento da grade principal, só que resumido num
  // único número por régua por família (soma do período em tela).
  const familiaReguas = useMemo(() => {
    return grupos
      .map(({ grupo, prefixos }) => {
        let stats = emptyStats();
        mesesExibidos.forEach((mes) => { stats = somarStats(stats, statsDoGrupo(prefixos, mes)); });
        return {
          familia: grupo,
          semAv: pctSemAvaria(stats) ?? 0,
          comAv: pctComAvaria(stats) ?? 0,
          comPrev: pctComAvariaEPreventiva(stats) ?? 0,
          diasComRegistro: stats.diasComRegistro,
        };
      })
      .filter((f) => f.diasComRegistro > 0);
  }, [grupos, mesesExibidos, statsPorPrefixo]);

  // Rótulo do período pro subtítulo dos gráficos — reflete o filtro de Mês em tela.
  const periodoLabel = useMemo(() => {
    if (filterMeses.size === 1) {
      const mes = [...filterMeses][0];
      const nome = MONTH_LABELS[mes - 1];
      return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`;
    }
    if (filterMeses.size === 0) return `${ano} (ano todo)`;
    return `${filterMeses.size} meses selecionados · ${ano}`;
  }, [filterMeses, ano]);

  // Clique num card crítico: expande a família do equipamento e rola até a
  // linha dele na grade, com um destaque temporário pra achar fácil.
  function irParaPrefixo(prefixo: string) {
    const familia = eqMap.get(prefixo)?.familia || 'Sem família';
    setExpandedGroups((prev) => new Set(prev).add(familia));
    setHighlightPrefixo(prefixo);
    requestAnimationFrame(() => {
      setTimeout(() => {
        rowRefs.current.get(prefixo)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    });
    setTimeout(() => setHighlightPrefixo((p) => (p === prefixo ? null : p)), 2500);
  }

  function toggleGrupo(grupo: string) {
    setExpandedGroups((prev) => {
      const n = new Set(prev);
      n.has(grupo) ? n.delete(grupo) : n.add(grupo);
      return n;
    });
  }

  /* ── Fecha popover de detalhamento ao clicar fora ─────────────────── */
  useEffect(() => {
    if (!cellPopover) return;
    function onMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCellPopover(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [cellPopover]);

  /* ── Fecha seletor de meses ao clicar fora ────────────────────────── */
  useEffect(() => {
    if (!mesPickerOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (mesPickerRef.current && !mesPickerRef.current.contains(e.target as Node)) {
        setMesPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [mesPickerOpen]);

  const hasFiltro = ano !== TODAY.getFullYear() || filterMeses.size > 0 || filterObras.size > 0 || filterGruposEquipamento.size > 0 || filterSituacao !== '';
  function limparFiltros() {
    setAno(TODAY.getFullYear());
    setFilterMeses(new Set());
    setFilterObras(new Set());
    setFilterGruposEquipamento(new Set());
    setFilterSituacao('');
  }

  const isLoading = disponibilidade.loading || equipments.loading || equipamentoObra.loading;

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <PageHeader
        title="Indicadores de Disponibilidade"
        description="Visão macro por família de equipamento, ao longo dos meses"
      />

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-wrap gap-4 items-end shadow-sm">
        <MultiSelectPicker
          label="Obra"
          options={obras}
          selected={filterObras}
          onChange={setFilterObras}
        />

        <MultiSelectPicker
          label="Grupo de Equipamento"
          options={gruposEquipamento}
          selected={filterGruposEquipamento}
          onChange={setFilterGruposEquipamento}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Situação</label>
          <FilterSelect
            value={filterSituacao}
            onChange={(v) => setFilterSituacao(v as SituacaoEquipamento | '')}
            placeholder="Todas"
            options={[
              { value: 'Mobilizado', label: 'Mobilizado' },
              { value: 'Desmobilizado', label: 'Desmobilizado' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Ano</label>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="h-[38px] px-3 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 relative" ref={mesPickerRef}>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Mês</label>
          <button
            type="button"
            onClick={() => setMesPickerOpen((o) => !o)}
            className={cn(
              'h-[38px] px-3 flex items-center gap-1.5 text-[13px] bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors min-w-[150px]',
              filterMeses.size > 0 ? 'text-gray-900 font-medium' : 'text-gray-400',
            )}
          >
            {filterMeses.size > 0
              ? [...filterMeses].sort((a, b) => a - b).map((m) => MONTH_LABELS[m - 1].slice(0, 3)).join(', ')
              : 'Todos'}
            <ChevronDown size={14} className="text-gray-400 shrink-0 ml-auto" />
          </button>

          {mesPickerOpen && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 w-[220px]">
              <div className="flex items-center justify-between px-1 pb-1.5 mb-1.5 border-b border-gray-100">
                <button
                  onClick={() => setFilterMeses(new Set(MESES))}
                  className="text-[11px] font-medium text-brand hover:underline"
                >
                  Selecionar todos
                </button>
                <button
                  onClick={() => setFilterMeses(new Set())}
                  className="text-[11px] text-gray-400 hover:text-gray-600"
                >
                  Limpar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MESES.map((mes) => {
                  const isSelected = filterMeses.has(mes);
                  return (
                    <button
                      key={mes}
                      onClick={() => {
                        setFilterMeses((prev) => {
                          const next = new Set(prev);
                          next.has(mes) ? next.delete(mes) : next.add(mes);
                          return next;
                        });
                      }}
                      className={cn(
                        'h-8 flex items-center justify-center text-[11px] font-medium rounded-md transition-colors capitalize',
                        isSelected ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {MONTH_LABELS[mes - 1].slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {hasFiltro && (
          <button
            onClick={limparFiltros}
            className="h-[38px] px-3 flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            Limpar filtros
          </button>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 ml-auto">
          <Info size={12} />
          <b className="text-gray-500">S/Av</b> = mecânica, avaria e preventiva (carência) não descontam · <b className="text-gray-500">C/Av</b> = avaria descontando · <b className="text-gray-500">C/Prev</b> = avaria e preventiva descontando. Em branco = sem status lançado. Clique numa célula pro detalhamento.
        </div>
      </div>

      {/* Resumo — dias de manutenção por tipo, de cara, sem precisar abrir nenhuma célula */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Dias por Avaria"
            value={totalGeral.diasAvaria}
            accentText="text-violet-600"
            accentBorder="border-violet-500"
            footer="Desconta em C/Av e C/Prev — nunca em S/Av"
          />
          <StatCard
            label="Dias por Preventiva (carência)"
            value={totalGeral.diasPreventivaCarencia}
            accentText="text-amber-600"
            accentBorder="border-amber-500"
            footer="Desconta só em C/Prev — não em S/Av nem C/Av"
          />
          <StatCard
            label="Manutenção confirmada"
            value={totalGeral.diasEfetivaClassificada}
            accentText="text-red-600"
            accentBorder="border-red-500"
            footer="Desconta nas 3 réguas (S/Av, C/Av, C/Prev)"
          />
          <StatCard
            label="Não classificado"
            value={totalGeral.diasNaoClassificado}
            accentText="text-gray-500"
            accentBorder="border-gray-400"
            footer="Desconta nas 3 réguas — sem tipo confirmado"
          />
        </div>
      )}

      {/* Prefixos críticos + gráficos de composição/comparação — lado a lado */}
      {!isLoading && (prefixosCriticos.length > 0 || totalM(totalGeral) > 0 || familiaReguas.length > 0) && (
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Ranking de prefixos críticos — os piores do período, clicáveis pra ir direto na grade */}
          {prefixosCriticos.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 w-full lg:w-[380px] lg:shrink-0">
              <p className="text-[12px] font-bold text-gray-800 px-1 mb-3">Prefixos críticos</p>
              <div className="space-y-2">
                {prefixosCriticos.map(({ prefixo, pct, motivo, nota }) => {
                  const eq = eqMap.get(prefixo);
                  const baixo = pct < 80;
                  return (
                    <button
                      key={prefixo}
                      type="button"
                      onClick={() => irParaPrefixo(prefixo)}
                      className="w-full text-left bg-white border border-gray-100 rounded-xl px-3.5 py-3 hover:border-brand/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12.5px] font-bold text-gray-900">{prefixo}</span>
                          <span className="text-[11px] text-gray-400 line-clamp-1">{eq?.descricao ?? eq?.familia ?? ''}</span>
                        </div>
                        <span className={cn('text-[16px] font-bold shrink-0', baixo ? 'text-red-600' : 'text-gray-700')}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', baixo ? 'bg-red-500' : 'bg-green-500')}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">
                        {motivo.label}{motivo.dias > 0 ? ` — ${motivo.dias} dia${motivo.dias !== 1 ? 's' : ''} no período` : ''}
                        {nota ? ` · "${nota}"` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {totalM(totalGeral) > 0 && (
              <ComposicaoManutencaoBar stats={totalGeral} periodoLabel={periodoLabel} />
            )}
            {familiaReguas.length > 0 && (
              <TresReguasPorFamilia linhas={familiaReguas} />
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <StateMessage>Carregando…</StateMessage>
      ) : grupos.length === 0 ? (
        <StateMessage>Nenhum equipamento ativo encontrado.</StateMessage>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-left border-collapse" style={{ minWidth: `${260 + mesesExibidos.length * 110}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-[260px] min-w-[260px]">
                    Família / Equipamento
                  </th>
                  {mesesExibidos.map((mes) => (
                    <th key={mes} className="px-2 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center border-l border-gray-100 w-[110px] min-w-[110px] capitalize">
                      {MONTH_LABELS[mes - 1].slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grupos.map(({ grupo, prefixos }) => {
                  const isExp = expandedGroups.has(grupo);
                  return (
                    <React.Fragment key={grupo}>
                      {/* ── Linha do grupo (agregada) ── */}
                      <tr className={cn('bg-gray-50/60 hover:bg-gray-100/60 transition-colors', isExp && 'border-b border-gray-100')}>
                        <td
                          onClick={() => toggleGrupo(grupo)}
                          className="sticky left-0 z-10 bg-gray-50/60 px-4 py-2.5 border-r border-gray-100 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            {isExp ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                            <span className="text-[12.5px] font-bold text-gray-800">{grupo}</span>
                            <span className="text-[10px] text-gray-400 font-medium">({prefixos.length})</span>
                          </div>
                        </td>
                        {mesesExibidos.map((mes) => {
                          const stats = statsDoGrupo(prefixos, mes);
                          const cellKey = `grupo:${grupo}||${mes}`;
                          return (
                            <AnaliseCell
                              key={mes}
                              cellKey={cellKey}
                              stats={stats}
                              isOpen={cellPopover === cellKey}
                              onToggle={() => setCellPopover((c) => (c === cellKey ? null : cellKey))}
                              popoverRef={cellPopover === cellKey ? popoverRef : undefined}
                              bold
                            />
                          );
                        })}
                      </tr>

                      {/* ── Linhas dos equipamentos (expandido) ── */}
                      {isExp && prefixos.map((prefixo) => {
                        const eq = eqMap.get(prefixo);
                        const isHighlighted = highlightPrefixo === prefixo;
                        return (
                          <tr
                            key={prefixo}
                            ref={(el) => { if (el) rowRefs.current.set(prefixo, el); }}
                            className={cn(
                              'transition-colors',
                              isHighlighted ? 'bg-brand/10 ring-1 ring-inset ring-brand' : 'hover:bg-brand-light/40',
                            )}
                          >
                            <td className={cn(
                              'sticky left-0 z-10 px-4 py-2 border-r border-gray-100 pl-9',
                              isHighlighted ? 'bg-brand/10' : 'bg-white',
                            )}>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-brand">{prefixo}</span>
                                <span className="text-[10px] text-gray-400 line-clamp-1">{eq?.descricao ?? ''}</span>
                              </div>
                            </td>
                            {mesesExibidos.map((mes) => {
                              const stats = statsPorPrefixo.get(prefixo)?.get(mes) ?? emptyStats();
                              const cellKey = `eq:${prefixo}||${mes}`;
                              return (
                                <AnaliseCell
                                  key={mes}
                                  cellKey={cellKey}
                                  stats={stats}
                                  isOpen={cellPopover === cellKey}
                                  onToggle={() => setCellPopover((c) => (c === cellKey ? null : cellKey))}
                                  popoverRef={cellPopover === cellKey ? popoverRef : undefined}
                                />
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
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

/* ── Célula: % + dias de manutenção, com popover de detalhamento ──────── */

interface AnaliseCellProps {
  cellKey: string;
  stats: MonthStats;
  isOpen: boolean;
  onToggle: () => void;
  popoverRef?: React.RefObject<HTMLDivElement>;
  bold?: boolean;
}

function AnaliseCell({ stats, isOpen, onToggle, popoverRef, bold }: AnaliseCellProps) {
  const semAv = pctSemAvaria(stats);
  const comAv = pctComAvaria(stats);
  const comTudo = pctComAvariaEPreventiva(stats);
  const dias = totalM(stats);
  const semDados = stats.diasComRegistro === 0;

  return (
    <td className="px-1.5 py-1.5 border-l border-gray-50 text-center relative">
      {semDados ? (
        <span className="text-[12px] text-gray-300">—</span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex flex-col items-center gap-0.5 rounded-md py-1 hover:bg-gray-100 transition-colors"
        >
          <PctLine label="S/Av" value={semAv} size={13} bold={bold} />
          <PctLine label="C/Av" value={comAv} size={12} bold={bold} />
          <PctLine label="C/Prev" value={comTudo} size={11} bold={bold} />
          <span className="text-[10px] text-gray-400 mt-0.5">
            {dias > 0 ? `${dias} dia${dias !== 1 ? 's' : ''} M` : '0 dia M'}
          </span>
        </button>
      )}

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-[230px] text-left"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-[12px]">
            <span className="text-gray-500">Disp. sem avaria</span>
            <span className="font-bold text-gray-800">{semAv}%</span>
          </div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-[12px]">
            <span className="text-gray-500">Disp. com avaria</span>
            <span className="font-bold text-gray-800">{comAv}%</span>
          </div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-[12px]">
            <span className="text-gray-500">Disp. com avaria e preventiva</span>
            <span className="font-bold text-gray-800">{comTudo}%</span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Dias de manutenção (M)</p>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-violet-400" /> Avaria
              </span>
              <span className="font-semibold text-gray-800">{stats.diasAvaria}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Preventiva (carência)
              </span>
              <span className="font-semibold text-gray-800">{stats.diasPreventivaCarencia}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Manutenção confirmada
              </span>
              <span className="font-semibold text-gray-800">{stats.diasEfetivaClassificada}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-gray-400" /> Não classificado
              </span>
              <span className="font-semibold text-gray-800">{stats.diasNaoClassificado}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-gray-100">
              <span className="text-gray-500">Dias com registro</span>
              <span className="font-semibold text-gray-800">{stats.diasComRegistro}</span>
            </div>
          </div>
        </div>
      )}
    </td>
  );
}

/** Uma linha "rótulo + %" dentro da célula — mesma lógica de cor (<80% vira vermelho) pras três métricas. */
function PctLine({ label, value, size, bold }: { label: string; value: number | null; size: number; bold?: boolean }) {
  const baixo = value !== null && value < 80;
  return (
    <span className="flex items-center gap-1">
      <span className="text-[9px] font-medium text-gray-400">{label}</span>
      <span
        className={cn(bold ? 'font-bold' : 'font-semibold', baixo ? 'text-red-600' : 'text-gray-700')}
        style={{ fontSize: size }}
      >
        {value}%
      </span>
    </span>
  );
}

/* ── Cores fixas das 3 réguas — as mesmas em qualquer gráfico da tela ──── */
const COR_SEM_AVARIA = { dot: 'bg-green-500', border: 'border-green-500', text: 'text-green-700', label: 'S/Av' };
const COR_COM_AVARIA = { dot: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-700', label: 'C/Av' };
const COR_COM_PREV   = { dot: 'bg-amber-500',  border: 'border-amber-500',  text: 'text-amber-700', label: 'C/Prev' };

/* ── Barra de composição dos dias de manutenção (Avaria/Preventiva/Confirmada/Não classificado) ── */

function ComposicaoManutencaoBar({ stats, periodoLabel }: { stats: MonthStats; periodoLabel: string }) {
  const total = totalM(stats);
  const segmentos = [
    { label: 'Avaria', dias: stats.diasAvaria, bg: 'bg-violet-400' },
    { label: 'Preventiva (carência)', dias: stats.diasPreventivaCarencia, bg: 'bg-amber-400' },
    { label: 'Manutenção confirmada', dias: stats.diasEfetivaClassificada, bg: 'bg-red-500' },
    { label: 'Não classificado', dias: stats.diasNaoClassificado, bg: 'bg-gray-400' },
  ].filter((s) => s.dias > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <p className="text-[13px] font-bold text-gray-800">Composição dos dias de manutenção</p>
      <p className="text-[11px] text-gray-400 mb-4">
        {periodoLabel} · {total} dia{total !== 1 ? 's' : ''} com status M
      </p>

      <div className="w-full h-8 rounded-lg overflow-hidden flex">
        {segmentos.map((s) => {
          const pct = Math.round((s.dias / total) * 100);
          return (
            <div
              key={s.label}
              title={`${s.label}: ${s.dias} dia${s.dias !== 1 ? 's' : ''} (${pct}%)`}
              className={cn('h-full flex items-center justify-center', s.bg)}
              style={{ width: `${(s.dias / total) * 100}%` }}
            >
              {pct >= 8 && <span className="text-[11px] font-bold text-white">{pct}%</span>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        {segmentos.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <span className={cn('w-2 h-2 rounded-full shrink-0', s.bg)} />
            {s.label} — {s.dias} dia{s.dias !== 1 ? 's' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Comparativo "dumbbell" das 3 réguas, por família ─────────────────── */

interface FamiliaRegua {
  familia: string;
  semAv: number;
  comAv: number;
  comPrev: number;
}

const EIXO_PONTOS = [0, 20, 40, 60, 80, 100];

function TresReguasPorFamilia({ linhas }: { linhas: FamiliaRegua[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-[13px] font-bold text-gray-800">Três réguas por família</p>
          <p className="text-[11px] text-gray-400">A distância entre os pontos é o que a avaria e a preventiva tiram da disponibilidade</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 shrink-0 pt-0.5">
          <span className="flex items-center gap-1"><span className={cn('w-2 h-2 rounded-full', COR_SEM_AVARIA.dot)} /> S/Av</span>
          <span className="flex items-center gap-1"><span className={cn('w-2 h-2 rounded-full', COR_COM_AVARIA.dot)} /> C/Av</span>
          <span className="flex items-center gap-1"><span className={cn('w-2 h-2 rounded-full', COR_COM_PREV.dot)} /> C/Prev</span>
        </div>
      </div>

      {/* Eixo 0–100% */}
      <div className="flex mt-5">
        <div className="w-[200px] shrink-0" />
        <div className="flex-1 relative h-4">
          {EIXO_PONTOS.map((v) => (
            <span
              key={v}
              className="absolute text-[10px] text-gray-400"
              style={{ left: `${v}%`, transform: v === 0 ? 'none' : v === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}
            >
              {v}%
            </span>
          ))}
        </div>
        <div className="w-[110px] shrink-0" />
      </div>

      <div className="space-y-4 mt-2">
        {linhas.map((l) => {
          const min = Math.min(l.semAv, l.comAv, l.comPrev);
          const max = Math.max(l.semAv, l.comAv, l.comPrev);
          const grupos = agruparPontosEmpatados(l);
          return (
            <div key={l.familia} className="flex items-center">
              <span className="w-[200px] shrink-0 text-[12px] font-semibold text-gray-700 pr-3" title={l.familia}>
                {l.familia}
              </span>
              <div className="flex-1 relative h-5">
                {EIXO_PONTOS.map((v) => (
                  <span key={v} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${v}%` }} />
                ))}
                <span
                  className="absolute top-1/2 h-0.5 bg-gray-300 -translate-y-1/2"
                  style={{ left: `${min}%`, width: `${Math.max(max - min, 0.5)}%` }}
                />
                {grupos.map((g) => (
                  <ReguaPonto key={g.valor} grupo={g} />
                ))}
              </div>
              <span className="w-[110px] shrink-0 text-right text-[11px] text-gray-500 pl-2">
                {l.semAv}% · {l.comAv}% · {l.comPrev}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Agrupa réguas com o mesmo valor — vira 1 marcador com anéis concêntricos
   em vez de pontos sobrepostos (ex.: sem nenhuma Avaria no período, C/Av
   sempre empata com S/Av, e o ponto roxo "desaparecia" atrás do verde) ──── */

interface PontoEmpatado { valor: number; itens: { cor: string; borda: string; label: string }[] }

function agruparPontosEmpatados(l: FamiliaRegua): PontoEmpatado[] {
  const entradas = [
    { valor: l.semAv, ...COR_SEM_AVARIA },
    { valor: l.comAv, ...COR_COM_AVARIA },
    { valor: l.comPrev, ...COR_COM_PREV },
  ];
  const porValor = new Map<number, PontoEmpatado['itens']>();
  entradas.forEach(({ valor, dot, border, label }) => {
    const lista = porValor.get(valor) ?? [];
    lista.push({ cor: dot, borda: border, label });
    porValor.set(valor, lista);
  });
  return [...porValor.entries()].map(([valor, itens]) => ({ valor, itens }));
}

/** 1 métrica = ponto cheio. 2+ empatadas = anéis concêntricos, um por métrica, de fora pra dentro. */
function ReguaPonto({ grupo }: { grupo: PontoEmpatado }) {
  const { valor, itens } = grupo;
  const titulo = itens.map((i) => i.label).join(' = ') + ` em ${valor}%`;

  let conteudo: React.ReactNode;
  if (itens.length === 1) {
    conteudo = <span className={cn('block w-2.5 h-2.5 rounded-full', itens[0].cor)} />;
  } else if (itens.length === 2) {
    conteudo = (
      <span className={cn('relative block w-4 h-4 rounded-full border-2', itens[0].borda)}>
        <span className={cn('absolute inset-[3px] rounded-full', itens[1].cor)} />
      </span>
    );
  } else {
    conteudo = (
      <span className={cn('relative block w-[22px] h-[22px] rounded-full border-2', itens[0].borda)}>
        <span className={cn('absolute inset-[3px] rounded-full border-2', itens[1].borda)}>
          <span className={cn('absolute inset-[3px] rounded-full', itens[2].cor)} />
        </span>
      </span>
    );
  }

  return (
    <span
      title={titulo}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ring-2 ring-white rounded-full"
      style={{ left: `${valor}%` }}
    >
      {conteudo}
    </span>
  );
}

/* ── Filtro de seleção múltipla (Obra, Grupo de Equipamento, …) — mesmo
   padrão visual do seletor de Mês: botão + popover com checkboxes, sem
   precisar marcar "todos" pra não filtrar nada. ──────────────────────── */

function MultiSelectPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const resumo = selected.size === 0
    ? 'Todos'
    : selected.size <= 2
      ? [...selected].join(', ')
      : `${selected.size} selecionados`;

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-[38px] px-3 flex items-center gap-1.5 text-[13px] bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors min-w-[170px] max-w-[240px]',
          selected.size > 0 ? 'text-gray-900 font-medium' : 'text-gray-400',
        )}
      >
        <span className="truncate">{resumo}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 w-[260px] max-h-[320px] overflow-y-auto">
          <div className="flex items-center justify-between px-1 pb-1.5 mb-1.5 border-b border-gray-100 sticky top-0 bg-white">
            <button
              onClick={() => onChange(new Set(options))}
              className="text-[11px] font-medium text-brand hover:underline"
            >
              Selecionar todos
            </button>
            <button
              onClick={() => onChange(new Set())}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {options.map((opt) => {
              const isSelected = selected.has(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = new Set(selected);
                    next.has(opt) ? next.delete(opt) : next.add(opt);
                    onChange(next);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 text-[12px] rounded-md text-left transition-colors',
                    isSelected ? 'bg-brand/10 text-brand font-medium' : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  <span className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                    isSelected ? 'bg-brand border-brand' : 'border-gray-300',
                  )}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </span>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
