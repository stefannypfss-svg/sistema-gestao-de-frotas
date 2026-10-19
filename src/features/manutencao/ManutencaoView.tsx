import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, subYears } from 'date-fns';
import { AlertTriangle, Wrench, PlayCircle, X, Pencil, Trash2 } from 'lucide-react';
import { Equipment, EquipamentoObra, EventoManutencao, TipoManutencao, SistemaManutencao } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { useEventosManutencaoLazy } from '../../hooks/useEventosManutencaoLazy';
import { verificarAberto, diasSemAtualizacao } from '../../services/manutencaoQueries';
import { executarBackfillManutencao } from '../../services/manutencaoBackfill';
import { disponibilidadeRepository } from '../../services';
import { PageHeader, StatCard, FilterSelect, StateMessage, Button } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Props {
  equipments: Collection<Equipment>;
  equipamentoObra: Collection<EquipamentoObra>;
}

const TODAY = new Date();
const TODAY_STR = format(TODAY, 'yyyy-MM-dd');

const TIPOS: TipoManutencao[] = ['Corretiva', 'Preventiva', 'Revisão', 'Avaria'];
/** Sentinela pro filtro de Tipo — evento sem `tipo` definido (nunca classificado). */
const TIPO_NAO_CLASSIFICADO = '__nao_classificado__';
const SISTEMAS: SistemaManutencao[] = ['Motor', 'Hidráulico', 'Elétrico', 'Rodante', 'Estrutura', 'Outro'];

function formatarData(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function rotuloEvento(e: EventoManutencao): string {
  const partes = [e.tipo, e.sistema].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Não classificado';
}

export function ManutencaoView({ equipments, equipamentoObra }: Props) {
  const [dataInicio] = useState(() => format(subYears(TODAY, 2), 'yyyy-MM-dd'));
  // Margem pra frente: um evento pode ter data_inicio de amanhã (ex.: alguém
  // marcou M num dia futuro) — sem isso a assinatura, presa a "até hoje",
  // nunca busca esse documento.
  const [dataFim] = useState(() => format(addDays(TODAY, 60), 'yyyy-MM-dd'));
  const eventos = useEventosManutencaoLazy(dataInicio, dataFim);

  const [filterFamilia, setFilterFamilia] = useState('');
  const [filterPrefixo, setFilterPrefixo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterSistema, setFilterSistema] = useState('');
  const [filterObra, setFilterObra] = useState('');

  const [abertosMap, setAbertosMap] = useState<Map<string, boolean>>(new Map());
  const [backfillRodando, setBackfillRodando] = useState(false);

  const [editingEvento, setEditingEvento] = useState<EventoManutencao | null>(null);
  const [editTipo, setEditTipo] = useState<TipoManutencao | ''>('');
  const [editSistema, setEditSistema] = useState<SistemaManutencao | ''>('');
  const [editNota, setEditNota] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const eqMap = useMemo(() => {
    const m = new Map<string, Equipment>();
    equipments.items.forEach((e) => m.set(e.prefixo, e));
    return m;
  }, [equipments.items]);

  // Obra atual de cada equipamento ativo (sem dataEnvio) em EquipxObra —
  // mesmo critério usado nas outras telas pra "obra em tela".
  const obraPorPrefixo = useMemo(() => {
    const m = new Map<string, string>();
    equipamentoObra.items.forEach((r) => {
      if (!r.dataEnvio) m.set(r.prefixo, r.obra);
    });
    return m;
  }, [equipamentoObra.items]);

  const obrasOptions = useMemo(
    () => [...new Set(obraPorPrefixo.values())].sort().map((o) => ({ value: o, label: o })),
    [obraPorPrefixo],
  );

  // Deriva "aberto" na leitura — checa só eventos com dataFim recente
  // (janela de 400 dias): equipamento esquecido além disso já teria sido
  // sinalizado pelo alerta de esquecimento bem antes.
  useEffect(() => {
    const candidatos = eventos.items.filter((e) => {
      const dias = diasSemAtualizacao(e, TODAY_STR);
      return dias <= 400;
    });
    let cancelado = false;
    (async () => {
      const entradas = await Promise.all(
        candidatos.map(async (e) => [e.id, await verificarAberto(e, TODAY_STR)] as const),
      );
      if (!cancelado) setAbertosMap(new Map(entradas));
    })();
    return () => {
      cancelado = true;
    };
  }, [eventos.items]);

  const eventosFiltrados = useMemo(() => {
    return eventos.items
      .filter((e) => !filterFamilia || eqMap.get(e.prefixo)?.familia === filterFamilia)
      .filter((e) => !filterPrefixo || e.prefixo === filterPrefixo)
      .filter((e) => !filterTipo || (filterTipo === TIPO_NAO_CLASSIFICADO ? !e.tipo : e.tipo === filterTipo))
      .filter((e) => !filterSistema || e.sistema === filterSistema)
      .filter((e) => !filterObra || obraPorPrefixo.get(e.prefixo) === filterObra)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  }, [eventos.items, eqMap, filterFamilia, filterPrefixo, filterTipo, filterSistema, filterObra, obraPorPrefixo]);

  const abertos = useMemo(
    () => eventosFiltrados.filter((e) => abertosMap.get(e.id)),
    [eventosFiltrados, abertosMap],
  );

  const totalDias = useMemo(() => eventosFiltrados.reduce((s, e) => s + e.diasParados, 0), [eventosFiltrados]);
  const ocorrencias = eventosFiltrados.length;
  const mediaDias = ocorrencias > 0 ? Math.round((totalDias / ocorrencias) * 10) / 10 : 0;

  const ranking = useMemo(() => {
    const porEquipamento = new Map<string, Map<string, number>>();
    eventosFiltrados.forEach((e) => {
      if (!e.sistema) return;
      const m = porEquipamento.get(e.prefixo) ?? new Map<string, number>();
      m.set(e.sistema, (m.get(e.sistema) ?? 0) + 1);
      porEquipamento.set(e.prefixo, m);
    });
    const linhas = [...porEquipamento.entries()].map(([prefixo, m]) => {
      const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      return { prefixo, sistema: top[0], ocorrencias: top[1] };
    });
    return linhas.sort((a, b) => b.ocorrencias - a.ocorrencias).slice(0, 10);
  }, [eventosFiltrados]);

  const familiasOptions = useMemo(() => {
    const familias = new Set(
      eventos.items.map((e) => eqMap.get(e.prefixo)?.familia).filter((f): f is string => !!f),
    );
    return [...familias].sort().map((f) => ({ value: f, label: f }));
  }, [eventos.items, eqMap]);

  const prefixosOptions = useMemo(() => {
    const prefixos = new Set(
      eventos.items
        .filter((e) => !filterFamilia || eqMap.get(e.prefixo)?.familia === filterFamilia)
        .map((e) => e.prefixo),
    );
    return [...prefixos].sort().map((p) => ({ value: p, label: p }));
  }, [eventos.items, eqMap, filterFamilia]);

  const handleFilterFamiliaChange = (value: string) => {
    setFilterFamilia(value);
    if (filterPrefixo && eqMap.get(filterPrefixo)?.familia !== value) {
      setFilterPrefixo('');
    }
  };

  const limparFiltros = () => {
    setFilterFamilia('');
    setFilterPrefixo('');
    setFilterTipo('');
    setFilterSistema('');
    setFilterObra('');
  };

  const temFiltroAtivo = filterFamilia || filterPrefixo || filterTipo || filterSistema || filterObra;

  const rodarBackfill = async () => {
    if (!window.confirm('Rodar o backfill de manutenção sobre todo o histórico? Isso pode levar alguns minutos.')) return;
    setBackfillRodando(true);
    try {
      const prefixos = equipments.items.map((e) => e.prefixo);
      const resultado = await executarBackfillManutencao(prefixos);
      console.log('[Manutenção] resultado do backfill:', resultado);
      const linhas = [
        `Equipamentos processados: ${resultado.equipamentosProcessados}`,
        `Blocos criados/atualizados: ${resultado.blocosCriados}`,
        `Blocos já consistentes: ${resultado.blocosJaConsistentes}`,
        `Blocos truncados: ${resultado.blocosTruncados}`,
        `Eventos órfãos removidos: ${resultado.orfaosRemovidos}`,
        resultado.falhas.length > 0 ? `Falhas: ${resultado.falhas.length} (detalhes no console)` : 'Falhas: 0',
      ];
      window.alert(`Backfill concluído\n\n${linhas.join('\n')}`);
    } finally {
      setBackfillRodando(false);
    }
  };

  function openEdit(e: EventoManutencao) {
    setEditingEvento(e);
    setEditTipo(e.tipo ?? '');
    setEditSistema(e.sistema ?? '');
    setEditNota(e.nota ?? '');
  }

  async function salvarEdicao() {
    if (!editingEvento) return;
    setSavingEdit(true);
    try {
      await eventos.update(editingEvento.id, {
        ...editingEvento,
        tipo: editTipo || null,
        sistema: editSistema || null,
        nota: editNota.trim() || null,
      });
      setEditingEvento(null);
    } catch (e) {
      console.error('[Manutenção] falha ao salvar edição do evento:', e);
      window.alert('Não foi possível salvar. Veja o console para detalhes.');
    } finally {
      setSavingEdit(false);
    }
  }

  // Excluir não basta — os dias (status_dia) desse equipamento continuam
  // apontando pro eventoId que vai deixar de existir. Sem limpar isso, eles
  // ficam "órfãos vivos": ainda contam como M, mas com um vínculo morto que
  // o backfill trata como "já consistente" (tem eventoId) e nunca
  // reprocessa. Limpa o `eventoId` de cada dia primeiro, pra esses dias
  // voltarem a ficar disponíveis pra reconciliação normal.
  async function excluirEvento(evento: EventoManutencao) {
    if (!window.confirm(`Excluir o evento de ${evento.prefixo} (${formatarData(evento.dataInicio)}–${formatarData(evento.dataFim)})? Os dias ficam marcados como M, mas sem classificação — rode o backfill depois se quiser reconciliá-los de novo.`)) {
      return;
    }
    setDeletingId(evento.id);
    try {
      const todos = await disponibilidadeRepository.list();
      const diasDoEvento = todos.filter((d) => d.eventoId === evento.id);
      for (const dia of diasDoEvento) {
        const { eventoId, ...resto } = dia;
        await disponibilidadeRepository.update(dia.id, resto);
      }
      await eventos.remove(evento.id);
    } catch (e) {
      console.error('[Manutenção] falha ao excluir evento:', e);
      window.alert('Não foi possível excluir. Veja o console para detalhes.');
    } finally {
      setDeletingId(null);
    }
  }

  const isLoading = eventos.loading || equipments.loading || equipamentoObra.loading;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Manutenção"
        description="Histórico derivado da Disponibilidade"
        action={
          <Button onClick={rodarBackfill} disabled={backfillRodando}>
            {backfillRodando ? 'Rodando…' : 'Rodar backfill'}
          </Button>
        }
      />

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total de dias em manutenção" value={totalDias} accentText="text-brand" accentBorder="border-brand" />
        <StatCard label="Número de ocorrências" value={ocorrencias} accentText="text-sky-600" accentBorder="border-sky-500" />
        <StatCard label="Média de dias por ocorrência" value={mediaDias} accentText="text-amber-600" accentBorder="border-amber-500" />
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Obra</label>
          <FilterSelect value={filterObra} onChange={setFilterObra} placeholder="Todas" options={obrasOptions} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Família</label>
          <FilterSelect value={filterFamilia} onChange={handleFilterFamiliaChange} placeholder="Todas" options={familiasOptions} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Equipamento</label>
          <FilterSelect value={filterPrefixo} onChange={setFilterPrefixo} placeholder="Todos" options={prefixosOptions} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Tipo</label>
          <FilterSelect
            value={filterTipo}
            onChange={setFilterTipo}
            placeholder="Todos"
            options={[...TIPOS.map((t) => ({ value: t, label: t })), { value: TIPO_NAO_CLASSIFICADO, label: 'Não classificado' }]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Sistema</label>
          <FilterSelect value={filterSistema} onChange={setFilterSistema} placeholder="Todos" options={SISTEMAS.map((s) => ({ value: s, label: s }))} />
        </div>

        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="h-[38px] px-3 flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <X size={13} /> Limpar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <StateMessage>Carregando…</StateMessage>
      ) : (
        <>
          {/* Bloco 1 — Em manutenção agora */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
              <PlayCircle size={16} className="text-red-500" /> Em manutenção agora
            </h2>
            {abertos.length === 0 ? (
              <StateMessage>Nenhum equipamento em manutenção no momento.</StateMessage>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {abertos.map((e) => {
                  const dias = diasSemAtualizacao(e, TODAY_STR);
                  const esquecido = dias > 30;
                  return (
                    <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-brand">{e.prefixo}</span>
                        <span className="text-[11px] text-gray-400">{e.diasParados} dias</span>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-1">{eqMap.get(e.prefixo)?.descricao ?? ''}</p>
                      <p className="text-[11px] text-gray-500">{rotuloEvento(e)}</p>
                      {esquecido && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-1.5">
                          <AlertTriangle size={11} /> há {dias} dias sem atualização
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bloco 2 — Histórico */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
              <Wrench size={16} className="text-gray-500" /> Histórico
            </h2>
            {eventosFiltrados.length === 0 ? (
              <StateMessage>Nenhuma manutenção registrada.</StateMessage>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-50">
                {eventosFiltrados.map((e) => (
                  <div key={e.id} className="px-5 py-3 flex items-start gap-3 group hover:bg-gray-50/60 transition-colors">
                    <span className="text-lg leading-none">🔧</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-800">
                        <span className="font-bold text-brand">{e.prefixo}</span>{' '}
                        {formatarData(e.dataInicio)}–{formatarData(e.dataFim)} · {e.diasParados} dias ·{' '}
                        {e.horasParciais ? `${Math.round(e.horasParadas)}h+` : `${Math.round(e.horasParadas)}h paradas`}
                        {e.truncado && <span className="text-amber-600"> · truncado</span>}
                      </p>
                      <p className={cn('text-[11px]', e.tipo || e.sistema ? 'text-gray-500' : 'text-gray-400 italic')}>
                        {rotuloEvento(e)}
                      </p>
                      {e.nota && <p className="text-[11px] text-gray-400 line-clamp-1">"{e.nota}"</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openEdit(e)}
                        title="Editar classificação"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => excluirEvento(e)}
                        disabled={deletingId === e.id}
                        title="Excluir evento"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bloco 3 — Ranking */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-bold text-gray-700">Sistema mais recorrente por equipamento</h2>
            {ranking.length === 0 ? (
              <StateMessage>Sem dados suficientes para ranking.</StateMessage>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-50">
                {ranking.map((r) => (
                  <div key={r.prefixo} className="px-5 py-2.5 flex items-center justify-between text-[12px]">
                    <span className="font-bold text-brand">{r.prefixo}</span>
                    <span className="text-gray-600">{r.sistema}</span>
                    <span className="text-gray-400">{r.ocorrencias}x</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Modal de edição ── */}
      {editingEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900">Editar classificação</h2>
              <button onClick={() => setEditingEvento(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-[12px] text-gray-500">
                <span className="font-bold text-brand">{editingEvento.prefixo}</span>{' '}
                {formatarData(editingEvento.dataInicio)}–{formatarData(editingEvento.dataFim)} · {editingEvento.diasParados} dias
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-medium">Tipo</label>
                <select
                  value={editTipo}
                  onChange={(e) => setEditTipo(e.target.value as TipoManutencao | '')}
                  className="h-9 px-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
                >
                  <option value="">— Não classificado —</option>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-medium">Sistema</label>
                <select
                  value={editSistema}
                  onChange={(e) => setEditSistema(e.target.value as SistemaManutencao | '')}
                  className="h-9 px-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
                >
                  <option value="">—</option>
                  {SISTEMAS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-medium">Nota</label>
                <textarea
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  rows={2}
                  placeholder="Observações adicionais…"
                  className="px-2 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditingEvento(null)} className="px-4 py-2 text-[13px] text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <Button variant="primary" onClick={salvarEdicao} disabled={savingEdit}>
                {savingEdit ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
