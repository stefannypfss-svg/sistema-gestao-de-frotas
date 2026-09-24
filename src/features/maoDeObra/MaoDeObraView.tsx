import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Eye, EyeOff, X, Wrench, Eraser } from 'lucide-react';
import { CargoMaoDeObra, DisponibilidadeStatus, EquipamentoObra, MaoDeObraRegistro, ObraMaoDeObra } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { useDisponibilidadeHoje } from '../../hooks/useDisponibilidadeHoje';
import { PageHeader, StateMessage } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Props {
  maoDeObra: Collection<MaoDeObraRegistro>;
  equipamentoObra: Collection<EquipamentoObra>;
}

const CARGOS: CargoMaoDeObra[] = ['Mecânico', 'Eletricista', 'Auxiliar'];
const OBRAS: ObraMaoDeObra[] = ['Dom Inocêncio', 'Esquina dos Ventos', 'Central de Equipamentos Rental'];
const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

// Mesmo rótulo/ordem usados na tela de Disponibilidade — o detalhamento por
// status daqui usa o lançamento de HOJE dessa mesma coleção, não o campo
// manual `statusOperacional` do cadastro do equipamento (que é editado à
// parte e costuma ficar desatualizado em relação ao dia a dia real).
const DISP_STATUS_LABEL: Record<DisponibilidadeStatus, string> = {
  EO: 'Em Operação',
  D:  'Disponível',
  M:  'Manutenção',
  PL: 'Proc. Liberação',
  AO: 'Apoio Oficina',
  UG: 'Uso Gerencial',
  V:  'Venda',
};
const DISP_STATUS_ORDER: DisponibilidadeStatus[] = ['EO', 'D', 'M', 'PL', 'AO', 'UG', 'V'];

function makeId(obra: ObraMaoDeObra, cargo: CargoMaoDeObra, ano: number, mes: number): string {
  return `${obra}||${cargo}||${ano}||${mes}`;
}

interface EquipStats {
  equipMobilizados: number;
  equipDesmobilizados: number;
  equipCount: number;
  statusPorSituacao: {
    Mobilizado: Map<DisponibilidadeStatus, number>;
    Desmobilizado: Map<DisponibilidadeStatus, number>;
  };
}

/** Equipamentos ativos (sem dataEnvio) numa obra, separados por `situacao` —
 * mobilizado (em obra) x desmobilizado (na base, mas ainda vinculado a essa
 * obra) — e, dentro de cada situação, pelo status de HOJE na Disponibilidade
 * (EO/D/M/PL/AO/UG/V). Sempre "agora": não existe histórico mensal de
 * equipamentos, só de pessoas — por isso essa conta vive fora da área
 * afetada pelo filtro de mês, não dentro dela. */
function calcEquipStats(
  equipamentoObraItems: EquipamentoObra[],
  dispStatusMap: Map<string, DisponibilidadeStatus>,
  obra: ObraMaoDeObra,
): EquipStats {
  const ativosDaObra = equipamentoObraItems.filter((r) => !r.dataEnvio && r.obra === obra);
  const mobilizadosLista = ativosDaObra.filter((r) => r.situacao === 'Mobilizado');
  const desmobilizadosLista = ativosDaObra.filter((r) => r.situacao === 'Desmobilizado');

  const contarPorStatus = (lista: EquipamentoObra[]) => {
    const m = new Map<DisponibilidadeStatus, number>();
    lista.forEach((r) => {
      const status = dispStatusMap.get(r.prefixo);
      if (!status) return;
      m.set(status, (m.get(status) ?? 0) + 1);
    });
    return m;
  };

  return {
    equipMobilizados: mobilizadosLista.length,
    equipDesmobilizados: desmobilizadosLista.length,
    equipCount: mobilizadosLista.length + desmobilizadosLista.length,
    statusPorSituacao: {
      Mobilizado: contarPorStatus(mobilizadosLista),
      Desmobilizado: contarPorStatus(desmobilizadosLista),
    },
  };
}

const TODAY = new Date();
const TODAY_STR = format(TODAY, 'yyyy-MM-dd');

const MONTH_LABELS = MESES.map((mes) => format(new Date(2024, mes - 1, 1), 'MMMM', { locale: ptBR }));

export function MaoDeObraView({ maoDeObra, equipamentoObra }: Props) {
  const [ano, setAno] = useState(TODAY.getFullYear());
  const [filterMes, setFilterMes] = useState<number | ''>('');
  const [filterObra, setFilterObra] = useState<ObraMaoDeObra | ''>('');

  const yearOptions = [TODAY.getFullYear() - 1, TODAY.getFullYear(), TODAY.getFullYear() + 1];
  const mesesExibidos = filterMes ? [filterMes] : MESES;
  const obrasExibidas = filterObra ? [filterObra] : OBRAS;
  const hasFiltro = ano !== TODAY.getFullYear() || filterMes !== '' || filterObra !== '';

  function limparFiltros() {
    setAno(TODAY.getFullYear());
    setFilterMes('');
    setFilterObra('');
  }

  const recordMap = useMemo(() => {
    const m = new Map<string, MaoDeObraRegistro>();
    maoDeObra.items.forEach((r) => m.set(r.id, r));
    return m;
  }, [maoDeObra.items]);

  // Status de hoje (Disponibilidade), por prefixo — mesma leitura usada no
  // card "status de hoje" do Dashboard.
  const dispHoje = useDisponibilidadeHoje(TODAY_STR);
  const dispStatusMap = useMemo(() => {
    const m = new Map<string, DisponibilidadeStatus>();
    dispHoje.forEach((r) => m.set(r.prefixo, r.status));
    return m;
  }, [dispHoje]);

  // Estatísticas de equipamento por obra — "hoje", independente de
  // ano/mês, calculadas uma vez aqui e reaproveitadas tanto no bloco de
  // resumo quanto na razão Equip./Pessoa de cada grade abaixo.
  const equipStatsPorObra = useMemo(() => {
    const m = new Map<ObraMaoDeObra, EquipStats>();
    OBRAS.forEach((obra) => m.set(obra, calcEquipStats(equipamentoObra.items, dispStatusMap, obra)));
    return m;
  }, [equipamentoObra.items, dispStatusMap]);

  const loading = maoDeObra.loading;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Mão de Obra"
        description="Quantidade e equipe por cargo, obra e mês"
      />

      {/* Equipamentos por obra — sempre "hoje", não depende do filtro de
         mês/ano abaixo (por isso fica numa seção própria, fora dele). */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5 mb-3">
          <Wrench size={14} className="text-gray-400" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">
            Equipamentos por obra (hoje — não muda com o filtro de mês)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OBRAS.map((obra) => {
            const stats = equipStatsPorObra.get(obra)!;
            return (
              <div key={obra} className="flex flex-col gap-1.5 rounded-lg border border-gray-100 px-3.5 py-3">
                <span className="text-[12.5px] font-semibold text-gray-800">{obra}</span>
                <span className="text-[13px] text-gray-600">
                  <b className="text-gray-900">{stats.equipMobilizados}</b> mobilizado{stats.equipMobilizados !== 1 ? 's' : ''} e{' '}
                  <b className="text-gray-900">{stats.equipDesmobilizados}</b> desmobilizado{stats.equipDesmobilizados !== 1 ? 's' : ''}
                </span>
                <div className="flex flex-col gap-1">
                  {(['Mobilizado', 'Desmobilizado'] as const).map((situacao) => {
                    const total = situacao === 'Mobilizado' ? stats.equipMobilizados : stats.equipDesmobilizados;
                    if (total === 0) return null;
                    return (
                      <div key={situacao} className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                        <span className="font-semibold text-gray-600">{situacao}:</span>
                        {DISP_STATUS_ORDER.map((status) => {
                          const qtd = stats.statusPorSituacao[situacao].get(status) ?? 0;
                          if (qtd === 0) return null;
                          return (
                            <span key={status} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {qtd} {DISP_STATUS_LABEL[status]}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Obra / Ano / Mês — filtros da grade de pessoas abaixo. */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Obra</label>
          <select
            value={filterObra}
            onChange={(e) => setFilterObra(e.target.value as ObraMaoDeObra | '')}
            className="h-[38px] px-3 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand min-w-[220px]"
          >
            <option value="">Todas</option>
            {OBRAS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
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

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">Mês</label>
          <select
            value={filterMes}
            onChange={(e) => setFilterMes(e.target.value ? Number(e.target.value) : '')}
            className="h-[38px] px-3 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand capitalize"
          >
            <option value="">Todos</option>
            {MESES.map((mes) => (
              <option key={mes} value={mes} className="capitalize">{MONTH_LABELS[mes - 1]}</option>
            ))}
          </select>
        </div>

        {hasFiltro && (
          <button
            onClick={limparFiltros}
            className="h-[38px] px-3 flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <Eraser size={13} /> Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <StateMessage>Carregando…</StateMessage>
      ) : (
        <div className="space-y-6">
          {obrasExibidas.map((obra) => (
            <ObraSection
              key={obra}
              obra={obra}
              ano={ano}
              mesesExibidos={mesesExibidos}
              maoDeObra={maoDeObra}
              recordMap={recordMap}
              equipCount={equipStatsPorObra.get(obra)!.equipCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Seção de uma obra: grade cargo × mês (pessoas) ──────────────────── */

interface ObraSectionProps {
  obra: ObraMaoDeObra;
  ano: number;
  mesesExibidos: number[];
  maoDeObra: Collection<MaoDeObraRegistro>;
  recordMap: Map<string, MaoDeObraRegistro>;
  /** Equipamentos de hoje nessa obra — só usado na razão Equip./Pessoa do rodapé. */
  equipCount: number;
}

function ObraSection({ obra, ano, mesesExibidos, maoDeObra, recordMap, equipCount }: ObraSectionProps) {
  const [nomesAberto, setNomesAberto] = useState<string | null>(null); // id da célula com o popover de nomes aberto
  const [nomesDraft, setNomesDraft] = useState('');
  const [quantidadeDraft, setQuantidadeDraft] = useState<Map<string, string>>(new Map());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Total de pessoas por mês (soma dos 3 cargos) — base do indicador Equip./Pessoa.
  const totalPessoasPorMes = useMemo(() => {
    const m = new Map<number, number>();
    MESES.forEach((mes) => {
      const total = CARGOS.reduce((s, cargo) => s + (recordMap.get(makeId(obra, cargo, ano, mes))?.quantidade ?? 0), 0);
      m.set(mes, total);
    });
    return m;
  }, [recordMap, obra, ano]);

  /* ── Fecha popover de nomes ao clicar fora ────────────────────── */
  useEffect(() => {
    if (!nomesAberto) return;
    function onMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setNomesAberto(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [nomesAberto]);

  /* ── Quantidade ───────────────────────────────────────────────── */

  function getQuantidadeValue(id: string): string {
    if (quantidadeDraft.has(id)) return quantidadeDraft.get(id) ?? '';
    const q = recordMap.get(id)?.quantidade;
    return q ? String(q) : '';
  }

  function handleQuantidadeChange(id: string, raw: string) {
    const digits = raw.replace(/\D/g, '');
    setQuantidadeDraft((prev) => new Map(prev).set(id, digits));
  }

  async function handleQuantidadeBlur(cargo: CargoMaoDeObra, mes: number) {
    const id = makeId(obra, cargo, ano, mes);
    if (!quantidadeDraft.has(id)) return;
    const quantidade = Number(quantidadeDraft.get(id)) || 0;
    const existing = recordMap.get(id);
    if (!existing && quantidade === 0) {
      setQuantidadeDraft((prev) => { const n = new Map(prev); n.delete(id); return n; });
      return;
    }
    const item: MaoDeObraRegistro = { id, obra, cargo, ano, mes, quantidade, nomes: existing?.nomes ?? [] };
    try {
      if (existing) {
        await maoDeObra.update(id, item);
      } else {
        await maoDeObra.create(item);
      }
      setQuantidadeDraft((prev) => { const n = new Map(prev); n.delete(id); return n; });
    } catch (e) {
      console.error('[MãoDeObra] falha ao salvar quantidade:', e);
      window.alert('Não foi possível salvar a quantidade. Veja o console para detalhes.');
    }
  }

  /* ── Nomes (ocultos por padrão) ───────────────────────────────── */

  function abrirNomes(cargo: CargoMaoDeObra, mes: number) {
    const id = makeId(obra, cargo, ano, mes);
    if (nomesAberto === id) {
      setNomesAberto(null);
      return;
    }
    setNomesDraft((recordMap.get(id)?.nomes ?? []).join('\n'));
    setNomesAberto(id);
  }

  async function salvarNomes(cargo: CargoMaoDeObra, mes: number) {
    const id = makeId(obra, cargo, ano, mes);
    const nomes = nomesDraft.split('\n').map((s) => s.trim()).filter(Boolean);
    const existing = recordMap.get(id);
    const item: MaoDeObraRegistro = { id, obra, cargo, ano, mes, quantidade: existing?.quantidade ?? 0, nomes };
    try {
      if (existing) {
        await maoDeObra.update(id, item);
      } else {
        await maoDeObra.create(item);
      }
      setNomesAberto(null);
    } catch (e) {
      console.error('[MãoDeObra] falha ao salvar nomes:', e);
      window.alert('Não foi possível salvar os nomes. Veja o console para detalhes.');
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-[14px] font-bold text-gray-900">{obra}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: `${180 + mesesExibidos.length * 100}px` }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[180px]">
                Cargo
              </th>
              {mesesExibidos.map((mes) => (
                <th key={mes} className="px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-center border-l border-gray-100 min-w-[100px] capitalize">
                  {format(new Date(ano, mes - 1, 1), 'MMM', { locale: ptBR })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {CARGOS.map((cargo) => (
              <tr key={cargo} className="hover:bg-gray-50/60 transition-colors group">
                <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 px-5 py-2.5 border-r border-gray-100">
                  <span className="text-[13px] font-semibold text-gray-800">{cargo}</span>
                </td>
                {mesesExibidos.map((mes) => {
                  const id = makeId(obra, cargo, ano, mes);
                  const record = recordMap.get(id);
                  const nomes = record?.nomes ?? [];
                  const temNomes = nomes.length > 0;
                  const isNomesAberto = nomesAberto === id;

                  return (
                    <td key={mes} className="px-2 py-1.5 border-l border-gray-50 relative">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getQuantidadeValue(id)}
                          placeholder="0"
                          onChange={(e) => handleQuantidadeChange(id, e.target.value)}
                          onBlur={() => handleQuantidadeBlur(cargo, mes)}
                          className="w-14 h-8 px-1 text-[13px] font-medium text-center bg-transparent border border-transparent hover:border-gray-200 focus:border-brand rounded-md outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => abrirNomes(cargo, mes)}
                          title={temNomes ? `${nomes.length} nome(s) cadastrado(s) — clique para ver` : 'Ver / adicionar nomes'}
                          className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0',
                            temNomes ? 'text-brand hover:bg-brand/10' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500',
                          )}
                        >
                          {temNomes ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </div>

                      {isNomesAberto && (
                        <div
                          ref={popoverRef}
                          className="absolute z-50 top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-[220px]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              <Users size={11} /> Nomes
                            </span>
                            <button onClick={() => setNomesAberto(null)} className="text-gray-300 hover:text-gray-500">
                              <X size={13} />
                            </button>
                          </div>
                          <textarea
                            value={nomesDraft}
                            onChange={(e) => setNomesDraft(e.target.value)}
                            rows={5}
                            placeholder={'Um nome por linha…'}
                            className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:border-brand resize-none"
                          />
                          <button
                            onClick={() => salvarNomes(cargo, mes)}
                            className="w-full mt-2 h-7 flex items-center justify-center text-[11px] font-medium text-white bg-brand rounded-md hover:opacity-90 transition-opacity"
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="sticky left-0 z-10 bg-gray-50 px-5 py-2.5 border-r border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Total de Pessoas
              </td>
              {mesesExibidos.map((mes) => (
                <td key={mes} className="px-3 py-2.5 border-l border-gray-100 text-center text-[13px] font-semibold text-gray-800">
                  {totalPessoasPorMes.get(mes) || '—'}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50 border-t border-gray-100">
              <td
                title="Equipamentos de hoje ÷ pessoas daquele mês — o numerador não varia por mês"
                className="sticky left-0 z-10 bg-gray-50 px-5 py-2.5 border-r border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide cursor-help"
              >
                Equip. / Pessoa
              </td>
              {mesesExibidos.map((mes) => {
                const totalPessoas = totalPessoasPorMes.get(mes) ?? 0;
                const ratio = totalPessoas > 0 ? equipCount / totalPessoas : null;
                return (
                  <td key={mes} className="px-3 py-2.5 border-l border-gray-100 text-center text-[13px] font-bold text-brand">
                    {ratio !== null ? ratio.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
