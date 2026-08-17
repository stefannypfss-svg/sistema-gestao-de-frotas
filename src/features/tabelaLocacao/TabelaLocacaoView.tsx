import React, { useMemo, useState, useCallback } from 'react';
import { Save, Info } from 'lucide-react';
import { Equipment, Work, TabelaLocacao, EquipamentoObra } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { cn } from '../../lib/utils';
import { PageHeader, Button, StateMessage } from '../../components/ui';
import { OBRAS_SEM_VALOR, makeTabelaLocacaoId } from '../../data/tabelaLocacaoSeed';

interface Props {
  equipments: Collection<Equipment>;
  works: Collection<Work>;
  tabelaLocacao: Collection<TabelaLocacao>;
  equipamentoObra: Collection<EquipamentoObra>;
}


export function TabelaLocacaoView({ equipments, works, tabelaLocacao, equipamentoObra }: Props) {
  // Mapa id → valor atual (fonte: tabelaLocacao.items)
  const [draft, setDraft] = useState<Map<string, number>>(new Map());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Inicializa draft quando tabelaLocacao carrega
  const tableMap = useMemo(() => {
    const m = new Map<string, number>();
    tabelaLocacao.items.forEach((t) => m.set(t.id, t.valor));
    return m;
  }, [tabelaLocacao.items]);

  // Valor efetivo de uma célula: draft tem prioridade, senão tableMap
  const getValue = useCallback(
    (descricao: string, obra: string): number => {
      const id = makeTabelaLocacaoId(descricao, obra);
      return draft.has(id) ? (draft.get(id) ?? 0) : (tableMap.get(id) ?? 0);
    },
    [draft, tableMap],
  );

  const handleChange = useCallback((descricao: string, obra: string, raw: string) => {
    const id = makeTabelaLocacaoId(descricao, obra);
    const num = Number(raw.replace(/\D/g, '')) || 0;
    setDraft((prev) => new Map(prev).set(id, num));
    setSavedAt(null);
  }, []);

  // Descrições únicas do Equipment (ordenadas) + qualquer descrição já na tabela
  const descriptions = useMemo(() => {
    const set = new Set<string>();
    equipments.items.forEach((e) => { if (e.descricao) set.add(e.descricao); });
    tabelaLocacao.items.forEach((t) => set.add(t.descricao));
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [equipments.items, tabelaLocacao.items]);

  // Obras com equipamentos ativos (sem dataEnvio), excluindo as sem valor de locação
  const obrasCols = useMemo(() => {
    const obrasAtivas = new Set(
      equipamentoObra.items.filter((r) => !r.dataEnvio).map((r) => r.obra),
    );
    return [...obrasAtivas]
      .filter((o) => !OBRAS_SEM_VALOR.includes(o))
      .sort();
  }, [equipamentoObra.items]);

  const isDirty = draft.size > 0;

  async function handleSave() {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      // Para cada célula no draft, upsert
      for (const [id, valor] of draft.entries()) {
        const [descricao, obra] = id.split('||');
        const item: TabelaLocacao = { id, descricao, obra, valor };
        if (tableMap.has(id)) {
          promises.push(tabelaLocacao.update(id, item));
        } else {
          promises.push(tabelaLocacao.create(item));
        }
      }
      await Promise.all(promises);
      setDraft(new Map());
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  const loading = equipments.loading || works.loading || tabelaLocacao.loading;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Tabela de Locação"
        description="Valor mensal por descrição de equipamento × obra"
        action={
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-[12px] text-green-600 font-medium">
                Salvo às {savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {isDirty && (
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                <Save size={15} />
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        }
      />

      {/* Info */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[12px] text-blue-700">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <div>
          <strong>Obras sem valor de locação (sempre R$ 0):</strong>{' '}
          {OBRAS_SEM_VALOR.join(', ')}. Elas não aparecem nas colunas abaixo.
          <br />
          Altere qualquer célula e clique em <strong>Salvar alterações</strong> para confirmar.
          Células em branco equivalem a R$ 0.
        </div>
      </div>

      {loading ? (
        <StateMessage>Carregando…</StateMessage>
      ) : descriptions.length === 0 ? (
        <StateMessage>Nenhuma descrição de equipamento encontrada.</StateMessage>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: `${260 + obrasCols.length * 160}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-20 bg-gray-50 px-5 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[260px] max-w-[400px]">
                    Descrição
                  </th>
                  {obrasCols.map((o) => (
                    <th key={o} className="px-4 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right border-l border-gray-100 min-w-[155px] whitespace-nowrap">
                      {o}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {descriptions.map((desc) => (
                  <tr key={desc} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 px-5 py-3 border-r border-gray-100">
                      <span className="text-[12px] text-gray-800 leading-snug">{desc}</span>
                    </td>
                    {obrasCols.map((obra) => {
                      const id = makeTabelaLocacaoId(desc, obra);
                      const isDrafted = draft.has(id);
                      const val = getValue(desc, obra);
                      return (
                        <td key={obra} className="px-3 py-2 border-l border-gray-50 text-right">
                          <div className={cn(
                            'relative flex items-center justify-end rounded-lg transition-colors',
                            isDrafted ? 'bg-yellow-50 ring-1 ring-yellow-300' : 'hover:bg-gray-100',
                          )}>
                            <span className="absolute left-3 text-[12px] text-gray-400 pointer-events-none">R$</span>
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={val || ''}
                              placeholder="0"
                              onChange={(e) => handleChange(desc, obra, e.target.value)}
                              className={cn(
                                'w-full pl-8 pr-3 py-2 text-[13px] font-medium text-right bg-transparent outline-none rounded-lg',
                                val > 0 ? 'text-gray-900' : 'text-gray-400',
                              )}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
