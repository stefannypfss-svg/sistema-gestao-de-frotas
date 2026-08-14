import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { EquipamentoObra, Equipment, Work } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { cn } from '../../lib/utils';
import { EquipamentoObraModal } from './EquipamentoObraModal';

interface Props {
  registros: Collection<EquipamentoObra>;
  equipments: Collection<Equipment>;
  works: Work[];
}

const OBRA_TO_ABBR: Record<string, string> = {
  'Dom Inocêncio':                'EDI',
  'Esquina dos Ventos':           'EDV',
  'Central de Equipamentos Rental': 'CER',
  'Alliance':                     'ALL',
  'Nortcom':                      'NORT',
  'Manutenção Terceirizada':       'OUTROS',
  'Cortez - Itarema - CE':        'CTZ-ITA',
  // fallback para códigos legados ainda não migrados
  'EDI': 'EDI', 'EDV': 'EDV', 'CER': 'CER',
  'ALI': 'ALL', 'NORTCOM': 'NORT', 'SP-MANUTENÇÃO': 'OUTROS', 'CTZ-ITA': 'CTZ-ITA',
};

function statusLocalizacao(obra: string): string {
  return OBRA_TO_ABBR[obra] ?? obra;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  // Stored as ISO (YYYY-MM-DD from date input) or DD/MM/YYYY from legacy
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function Cell({ value, mono = false }: { value?: string | null; mono?: boolean }) {
  const text = !value ? '—' : value;
  return (
    <td className={cn(
      'px-3 py-2.5 text-[12px] whitespace-nowrap border-b border-gray-100',
      mono ? 'font-mono text-gray-700' : 'text-gray-600',
      text === '—' && 'text-gray-300',
    )}>
      {text}
    </td>
  );
}

export function EquipamentoObraView({ registros, equipments, works }: Props) {
  const [search, setSearch] = useState('');
  const [filterObra, setFilterObra] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('');
  const [editing, setEditing] = useState<EquipamentoObra | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const items = registros.items;

  const obras = useMemo(
    () => [...new Set(items.map((r) => r.obra).filter(Boolean))].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((r) => {
      if (filterObra && r.obra !== filterObra) return false;
      if (filterSituacao && r.situacao !== filterSituacao) return false;
      if (!q) return true;
      return (
        r.prefixo.toLowerCase().includes(q) ||
        r.obra.toLowerCase().includes(q) ||
        (r.observacao ?? '').toLowerCase().includes(q)
      );
    }).sort((a, b) => a.prefixo.localeCompare(b.prefixo));
  }, [items, search, filterObra, filterSituacao]);

  async function handleSave(record: EquipamentoObra) {
    if (adding) {
      await registros.create(record);
    } else {
      await registros.update(record.id, record);
    }
    // Sincronizar situação no registro de equipamento
    const eq = equipments.items.find((e) => e.prefixo === record.prefixo);
    if (eq && eq.situacao !== record.situacao) {
      await equipments.update(record.prefixo, { ...eq, situacao: record.situacao });
    }
  }

  async function handleDelete(id: string) {
    await registros.remove(id);
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Equipamento por Obra</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Busca */}
          <div className="relative w-full md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por prefixo ou obra..."
              className="w-full pl-8 pr-4 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>

          {/* Filtro Obra */}
          <select
            value={filterObra}
            onChange={(e) => setFilterObra(e.target.value)}
            className="px-3 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-gray-600"
          >
            <option value="">Todas as obras</option>
            {obras.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>

          {/* Filtro Situação */}
          <select
            value={filterSituacao}
            onChange={(e) => setFilterSituacao(e.target.value)}
            className="px-3 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-gray-600"
          >
            <option value="">Todas as situações</option>
            <option value="Mobilizado">Mobilizado</option>
            <option value="Desmobilizado">Desmobilizado</option>
          </select>

          {/* Botão adicionar */}
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-[13px] font-semibold rounded-xl hover:bg-brand/90 transition-colors"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {[
                  'Prefixo',
                  'Localização',
                  'Situação',
                  'Status Localização',
                  'Data Recebimento',
                  'Data Lib. Mecânica',
                  'Data Mobilização',
                  'Data Desmobilização',
                  'Data Envio',
                  'Observação',
                  'Ações',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-200 bg-gray-50"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-[13px] text-gray-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Prefixo */}
                    <td className="px-3 py-2.5 border-b border-gray-100">
                      <span className="font-mono font-semibold text-[12px] text-brand bg-brand-light px-2 py-0.5 rounded">
                        {r.prefixo}
                      </span>
                    </td>

                    {/* Localização */}
                    <Cell value={r.obra} />

                    {/* Situação */}
                    <td className="px-3 py-2.5 border-b border-gray-100">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                        r.situacao === 'Mobilizado'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200',
                      )}>
                        {r.situacao}
                      </span>
                    </td>

                    {/* Status Localização */}
                    <td className="px-3 py-2.5 border-b border-gray-100">
                      <span className="font-mono text-[12px] text-gray-600">
                        {statusLocalizacao(r.obra) || '—'}
                      </span>
                    </td>

                    {/* Datas */}
                    <Cell value={formatDate(r.dataRecebimento)} />
                    <Cell value={formatDate(r.dataLiberacaoMecanica)} />
                    <Cell value={formatDate(r.dataMobilizacao)} />
                    <Cell value={formatDate(r.dataDesmobilizacao)} />
                    <Cell value={formatDate(r.dataEnvio)} />

                    {/* Observação */}
                    <td className="px-3 py-2.5 text-[12px] text-gray-500 border-b border-gray-100 max-w-[220px]">
                      <span className="line-clamp-2">{r.observacao || '—'}</span>
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-2.5 border-b border-gray-100 whitespace-nowrap">
                      {confirmDelete === r.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-red-600 font-medium">Excluir?</span>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="px-2 py-0.5 text-[11px] font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-0.5 text-[11px] font-semibold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditing(r)}
                            title="Editar"
                            className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(r.id)}
                            title="Excluir"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {(adding || editing) && (
        <EquipamentoObraModal
          record={editing ?? undefined}
          equipments={equipments.items}
          works={works}
          onSave={handleSave}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
