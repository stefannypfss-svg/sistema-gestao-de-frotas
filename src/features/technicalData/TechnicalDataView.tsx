import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Pencil, Trash2, Plus } from 'lucide-react';
import { Equipment } from '../../types';
import { Collection } from '../../hooks/useCollection';
import { cn } from '../../lib/utils';
import { TechnicalEditModal } from './TechnicalEditModal';

interface Props {
  equipments: Collection<Equipment>;
}

type SectionKey = 'identificacao' | 'documentacao' | 'financeiro' | 'operacional';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'identificacao', label: 'Identificação' },
  { key: 'documentacao', label: 'Documentação' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'operacional', label: 'Operacional' },
];

function formatBRL(value?: number): string {
  if (value === undefined || value === null || value === 0) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function Cell({ value, mono = false }: { value?: string | number | null; mono?: boolean }) {
  const text = value === undefined || value === null || value === '' ? '—' : String(value);
  return (
    <td
      className={cn(
        'px-3 py-2.5 text-[12px] whitespace-nowrap border-b border-gray-100',
        mono ? 'font-mono text-gray-700' : 'text-gray-600',
        text === '—' && 'text-gray-300',
      )}
    >
      {text}
    </td>
  );
}

function StatusGeral({ value }: { value?: string }) {
  if (!value) return <td className="px-3 py-2.5 border-b border-gray-100"><span className="text-gray-300 text-[12px]">—</span></td>;
  const color =
    value === 'A Venda'
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : value === 'Uso interno'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-green-50 text-green-700 border-green-200';
  return (
    <td className="px-3 py-2.5 border-b border-gray-100">
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border', color)}>
        {value}
      </span>
    </td>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-gray-600"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function TechnicalDataView({ equipments }: Props) {
  const [search, setSearch] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterFamilia, setFilterFamilia] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('identificacao');
  const [sortField, setSortField] = useState<keyof Equipment>('prefixo');
  const [sortAsc, setSortAsc] = useState(true);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const items = equipments.items;

  const grupos = useMemo(() => [...new Set(items.map((e) => e.grupoEquipamento).filter(Boolean))].sort(), [items]);
  const familias = useMemo(() => {
    const source = filterGrupo ? items.filter((e) => e.grupoEquipamento === filterGrupo) : items;
    return [...new Set(source.map((e) => e.familia).filter(Boolean))].sort();
  }, [items, filterGrupo]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter((e) => {
        if (filterGrupo && e.grupoEquipamento !== filterGrupo) return false;
        if (filterFamilia && e.familia !== filterFamilia) return false;
        if (!q) return true;
        return (
          e.prefixo.toLowerCase().includes(q) ||
          e.descricao.toLowerCase().includes(q) ||
          (e.marca ?? '').toLowerCase().includes(q) ||
          e.modelo.toLowerCase().includes(q) ||
          (e.chassi ?? '').toLowerCase().includes(q) ||
          (e.placa ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const av = String(a[sortField] ?? '');
        const bv = String(b[sortField] ?? '');
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [items, search, filterGrupo, filterFamilia, sortField, sortAsc]);

  function toggleSort(field: keyof Equipment) {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(true); }
  }

  async function handleSave(updated: Equipment) {
    if (creating) {
      if (items.some((e) => e.prefixo === updated.prefixo)) {
        alert('Prefixo já cadastrado!');
        return;
      }
      await equipments.create(updated);
      setCreating(false);
    } else {
      await equipments.update(updated.prefixo, updated);
    }
  }

  async function handleDelete(prefixo: string) {
    await equipments.remove(prefixo);
    setConfirmDelete(null);
  }

  function Th({ label, field }: { label: string; field?: keyof Equipment }) {
    const active = field && sortField === field;
    return (
      <th
        onClick={field ? () => toggleSort(field) : undefined}
        className={cn(
          'px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-200 bg-gray-50',
          field && 'cursor-pointer select-none hover:text-brand',
          active && 'text-brand',
        )}
      >
        <span className="flex items-center gap-1">
          {label}
          {active && (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Dados Técnicos dos Equipamentos</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {filtered.length} equipamento{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => { setEditing(null); setCreating(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-[13px] font-semibold rounded-xl hover:bg-brand/90 transition-colors"
          >
            <Plus size={14} />
            Novo Equipamento
          </button>
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por prefixo, descrição, chassi..."
              className="w-full pl-8 pr-4 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
          <FilterSelect
            label="Grupo de equipamentos"
            value={filterGrupo}
            onChange={(v) => { setFilterGrupo(v); setFilterFamilia(''); }}
            options={grupos}
          />
          <FilterSelect
            label="Todas as famílias"
            value={filterFamilia}
            onChange={setFilterFamilia}
            options={familias}
          />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all',
              activeSection === s.key
                ? 'bg-brand text-white'
                : 'text-gray-500 hover:text-brand hover:bg-brand/5',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th label="Prefixo" field="prefixo" />

                {activeSection === 'identificacao' && (
                  <>
                    <Th label="Status Geral" field="statusGeral" />
                    <Th label="Grupo" field="grupoEquipamento" />
                    <Th label="Família" field="familia" />
                    <Th label="Descrição" field="descricao" />
                    <Th label="Marca" field="marca" />
                    <Th label="Modelo" field="modelo" />
                    <Th label="Ano" field="ano" />
                    <Th label="Info Implemento" />
                    <Th label="Seguro" field="seguro" />
                    <Th label="Rastreador" field="rastreador" />
                  </>
                )}

                {activeSection === 'documentacao' && (
                  <>
                    <Th label="Placa" field="placa" />
                    <Th label="RENAVAM" />
                    <Th label="Chassi / Nº de Série" field="chassi" />
                    <Th label="Nº Nota Fiscal" />
                    <Th label="Data de Compra" field="dataCompra" />
                    <Th label="Fornecedor" field="fornecedor" />
                    <Th label="Empresa Aquisidora" field="empresaAquisidora" />
                    <Th label="Tipo de Contrato" field="tipoContrato" />
                  </>
                )}

                {activeSection === 'financeiro' && (
                  <>
                    <Th label="Vlr. Locação 2024" field="valorLocacao" />
                    <Th label="Mín. Contratual" field="franquia" />
                    <Th label="Vlr. de Compra" field="valorCompra" />
                    <Th label="Vlr. Anúncio Venda" field="valorAnuncioVenda" />
                    <Th label="Vlr. de Mercado" field="valorMercado" />
                    <Th label="Tempo Depreciação" field="tempoDepreciacao" />
                  </>
                )}

                {activeSection === 'operacional' && (
                  <>
                    <Th label="Localização" field="localizacaoAtual" />
                    <Th label="Situação" field="situacao" />
                    <Th label="Status Operacional" field="statusOperacional" />
                    <Th label="Prev. Liberação" />
                    <Th label="Ação" />
                    <Th label="Prev. Mobilização" />
                    <Th label="Observações" />
                  </>
                )}

                {/* Ações sempre visível à direita */}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-200 bg-gray-50">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-[13px] text-gray-400">
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.prefixo} className="hover:bg-gray-50/60 transition-colors">
                    {/* Prefixo */}
                    <td className="px-3 py-2.5 border-b border-gray-100">
                      <span className="font-mono font-semibold text-[12px] text-brand bg-brand-light px-2 py-0.5 rounded">
                        {e.prefixo}
                      </span>
                    </td>

                    {activeSection === 'identificacao' && (
                      <>
                        <StatusGeral value={e.statusGeral} />
                        <Cell value={e.grupoEquipamento} />
                        <Cell value={e.familia} />
                        <td className="px-3 py-2.5 text-[12px] text-gray-700 border-b border-gray-100 max-w-[280px]">
                          <span className="line-clamp-2">{e.descricao || '—'}</span>
                        </td>
                        <Cell value={e.marca} />
                        <Cell value={e.modelo} mono />
                        <Cell value={e.ano} />
                        <Cell value={e.infoImplemento} />
                        <Cell value={e.seguro} />
                        <Cell value={e.rastreador} />
                      </>
                    )}

                    {activeSection === 'documentacao' && (
                      <>
                        <Cell value={e.placa} mono />
                        <Cell value={e.renavam} mono />
                        <Cell value={e.chassi} mono />
                        <Cell value={e.nNotaFiscal} />
                        <Cell value={e.dataCompra} />
                        <Cell value={e.fornecedor} />
                        <Cell value={e.empresaAquisidora} />
                        <Cell value={e.tipoContrato} />
                      </>
                    )}

                    {activeSection === 'financeiro' && (
                      <>
                        <td className="px-3 py-2.5 text-[12px] font-medium text-gray-700 border-b border-gray-100 whitespace-nowrap">
                          {formatBRL(e.valorLocacao)}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 border-b border-gray-100 whitespace-nowrap">
                          {e.franquia ? `${e.franquia.toLocaleString('pt-BR')} h` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 border-b border-gray-100 whitespace-nowrap">
                          {formatBRL(e.valorCompra)}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 border-b border-gray-100 whitespace-nowrap">
                          {formatBRL(e.valorAnuncioVenda)}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] font-medium text-gray-700 border-b border-gray-100 whitespace-nowrap">
                          {formatBRL(e.valorMercado)}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 border-b border-gray-100 whitespace-nowrap">
                          {e.tempoDepreciacao ? `${e.tempoDepreciacao} anos` : '—'}
                        </td>
                      </>
                    )}

                    {activeSection === 'operacional' && (
                      <>
                        <Cell value={e.localizacaoAtual} mono />
                        <td className="px-3 py-2.5 border-b border-gray-100">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                            e.situacao === 'Mobilizado'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200',
                          )}>
                            {e.situacao}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-gray-100">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                            e.statusOperacional === 'Operação'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : e.statusOperacional === 'Manutenção'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200',
                          )}>
                            {e.statusOperacional}
                          </span>
                        </td>
                        <Cell value={e.previsaoLiberacao} />
                        <td className="px-3 py-2.5 text-[12px] text-gray-600 border-b border-gray-100 max-w-[200px]">
                          <span className="line-clamp-2">{e.acao || '—'}</span>
                        </td>
                        <Cell value={e.previsaoMobilizacao} />
                        <td className="px-3 py-2.5 text-[12px] text-gray-500 border-b border-gray-100 max-w-[260px]">
                          <span className="line-clamp-2">{e.obs || '—'}</span>
                        </td>
                      </>
                    )}

                    {/* Ações */}
                    <td className="px-3 py-2.5 border-b border-gray-100 whitespace-nowrap">
                      {confirmDelete === e.prefixo ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-red-600 font-medium">Excluir?</span>
                          <button
                            onClick={() => handleDelete(e.prefixo)}
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
                            onClick={() => setEditing(e)}
                            title="Editar"
                            className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(e.prefixo)}
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

      {/* Modal editar / criar */}
      {(editing || creating) && (
        <TechnicalEditModal
          equipment={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}
