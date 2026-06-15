import React from 'react';
import { Search, Plus, Edit, ArrowRightLeft, Trash2, Eraser } from 'lucide-react';
import { Equipment, EquipmentStatus, Allocation } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import {
  getEquipmentLocation,
  computeFleetStats,
  uniqueFamilies,
  percentOfFleet,
} from '../../domain/equipment';
import { HOME_BASE } from '../../config/theme';
import { Collection } from '../../hooks/useCollection';
import { StatusBadge } from '../../components/StatusBadge';
import {
  PageHeader,
  Button,
  Card,
  StatCard,
  StateMessage,
  FilterSelect,
} from '../../components/ui';
import { EquipmentModal } from './EquipmentModal';
import { StatusUpdateModal } from './StatusUpdateModal';

interface EquipmentsViewProps {
  equipments: Collection<Equipment>;
  allocations: Allocation[];
}

export const EquipmentsView: React.FC<EquipmentsViewProps> = ({
  equipments,
  allocations,
}) => {
  const { items, loading, error } = equipments;
  const [search, setSearch] = React.useState('');
  const [filterFamily, setFilterFamily] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterLocation, setFilterLocation] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Equipment | undefined>();
  const [statusModalEq, setStatusModalEq] = React.useState<Equipment | undefined>();

  const families = uniqueFamilies(items);
  const locations = Array.from(
    new Set(items.map((e) => getEquipmentLocation(e.prefixo, allocations))),
  ).sort();
  const stats = computeFleetStats(items, allocations);

  const filtered = items.filter((e) => {
    const location = getEquipmentLocation(e.prefixo, allocations);
    const term = search.toLowerCase();
    const matchesSearch =
      e.prefixo.toLowerCase().includes(term) ||
      e.familia.toLowerCase().includes(term) ||
      e.descricao.toLowerCase().includes(term);
    return (
      matchesSearch &&
      (!filterFamily || e.familia === filterFamily) &&
      (!filterStatus || e.status === filterStatus) &&
      (!filterLocation || location === filterLocation)
    );
  });

  const clearFilters = () => {
    setSearch('');
    setFilterFamily('');
    setFilterLocation('');
    setFilterStatus('');
  };

  const handleSave = (eq: Equipment) => {
    if (editing) {
      void equipments.update(editing.prefixo, eq);
    } else {
      if (items.some((e) => e.prefixo === eq.prefixo)) {
        alert('Prefixo já cadastrado!');
        return;
      }
      void equipments.create(eq);
    }
    setIsModalOpen(false);
    setEditing(undefined);
  };

  const handleDelete = (prefixo: string) => {
    if (confirm(`Deseja remover o equipamento ${prefixo}?`)) {
      void equipments.remove(prefixo);
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Equipamentos"
        description="Gerencie a frota de máquinas e veículos pesados"
        action={
          <Button onClick={() => { setEditing(undefined); setIsModalOpen(true); }}>
            <Plus size={20} /> Novo Equipamento
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Geral"
          value={stats.total}
          accentText="text-neutral"
          accentBorder="border-l-neutral"
          footer="Mapeamento completo"
        />
        <StatCard
          label="Locados"
          value={stats.locados}
          accentText="text-brand"
          accentBorder="border-l-brand"
          footer={
            <span className="bg-brand-light text-brand rounded-full px-2 py-0.5 text-[12px] font-medium leading-none">
              {percentOfFleet(stats.locados, stats.total)}% da frota
            </span>
          }
        />
        <StatCard
          label="Disponíveis"
          value={stats.disponiveis}
          accentText="text-info"
          accentBorder="border-l-info"
          footer={
            <span className="bg-info-light text-info rounded-full px-2 py-0.5 text-[12px] font-medium leading-none">
              {percentOfFleet(stats.disponiveis, stats.total)}% da frota
            </span>
          }
        />
        <StatCard
          label="Em Manutenção"
          value={stats.manutencao}
          accentText="text-warning"
          accentBorder="border-l-warning"
          footer={
            <span className="bg-warning-light text-warning rounded-full px-2 py-0.5 text-[12px] font-medium leading-none">
              {percentOfFleet(stats.manutencao, stats.total)}% da frota
            </span>
          }
        />
      </div>

      <Card>
        <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-100">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por prefixo, família ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-[34px] pr-3 h-[42px] bg-white rounded-full border border-line outline-none text-[13px] font-medium transition-all focus:border-brand placeholder:text-gray-400 text-gray-900 shadow-sm"
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
            <FilterSelect
              value={filterFamily}
              onChange={setFilterFamily}
              placeholder="Todas as Famílias"
              options={families.map((f) => ({ value: f, label: f }))}
            />
            <FilterSelect
              value={filterLocation}
              onChange={setFilterLocation}
              placeholder="Todas as Localizações"
              options={locations.map((l) => ({ value: l, label: l }))}
            />
            <FilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Todos os Status"
              options={[
                { value: 'Disponível', label: 'Disponível' },
                { value: 'Locado', label: 'Locado' },
                { value: 'Em Manutenção', label: 'Em Manutenção' },
                { value: 'Vendido', label: 'Vendido' },
              ]}
            />
            <button
              type="button"
              onClick={clearFilters}
              title="Limpar filtros"
              className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white border border-line text-gray-500 hover:bg-surface-muted transition-colors shadow-sm shrink-0"
            >
              <Eraser size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <StateMessage>Carregando equipamentos…</StateMessage>
        ) : error ? (
          <StateMessage>Erro ao carregar: {error}</StateMessage>
        ) : filtered.length === 0 ? (
          <StateMessage>Nenhum equipamento encontrado.</StateMessage>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-white">
                  {['Prefixo', 'Equipamento', 'Ano', 'Localização', 'Valor Locação', 'Status'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] border-b border-gray-50"
                      >
                        {h}
                      </th>
                    ),
                  )}
                  <th className="px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] border-b border-gray-50 text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => {
                  const location = getEquipmentLocation(e.prefixo, allocations);
                  return (
                    <tr key={e.prefixo} className="hover:bg-brand-light transition-colors group">
                      <td className="px-8 py-5 text-[13px] font-medium text-brand">{e.prefixo}</td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-gray-900">{e.familia}</span>
                          <span className="text-[12px] text-gray-500 line-clamp-1 mt-[1px]">
                            {e.descricao}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[12px] text-gray-500 font-medium">{e.ano}</td>
                      <td className="px-8 py-5 text-[13px] text-gray-700 font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full inline-block shrink-0',
                              location === HOME_BASE ? 'bg-warning' : 'bg-info',
                            )}
                          />
                          {location}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[13px] font-medium text-gray-900">
                        {formatCurrency(e.valorLocacao)}
                      </td>
                      <td className="px-8 py-5">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setEditing(e); setIsModalOpen(true); }}
                            title="Editar"
                            className="w-7 h-7 border border-line rounded-md flex items-center justify-center bg-white cursor-pointer text-gray-500 hover:bg-surface-muted hover:text-brand transition-all"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setStatusModalEq(e)}
                            title="Alterar Status"
                            className="w-7 h-7 border border-line rounded-md flex items-center justify-center bg-white cursor-pointer text-gray-500 hover:bg-surface-muted hover:text-brand transition-all"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(e.prefixo)}
                            title="Excluir"
                            className="w-7 h-7 border border-line rounded-md flex items-center justify-center bg-white cursor-pointer text-gray-500 hover:bg-surface-muted hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <EquipmentModal
          equipment={editing}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditing(undefined); }}
        />
      )}
      {statusModalEq && (
        <StatusUpdateModal
          equipment={statusModalEq}
          onSave={(status) => {
            void equipments.update(statusModalEq.prefixo, { ...statusModalEq, status });
            setStatusModalEq(undefined);
          }}
          onClose={() => setStatusModalEq(undefined)}
        />
      )}
    </div>
  );
};
