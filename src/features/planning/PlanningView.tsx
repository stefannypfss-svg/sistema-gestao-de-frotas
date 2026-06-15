import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Equipment, Allocation, Work } from '../../types';
import { cn } from '../../lib/utils';
import { ALLOCATION_STATUS_STYLES } from '../../config/theme';
import {
  getEquipmentLocation,
  computeFleetStats,
  uniqueFamilies,
} from '../../domain/equipment';
import { Collection } from '../../hooks/useCollection';
import { StatusBadge } from '../../components/StatusBadge';
import {
  PageHeader,
  Button,
  Card,
  StatCard,
  FilterSelect,
  Drawer,
} from '../../components/ui';
import { AllocationForm } from './AllocationForm';

interface PlanningViewProps {
  equipments: Equipment[];
  works: Work[];
  allocations: Collection<Allocation>;
}

export const PlanningView: React.FC<PlanningViewProps> = ({
  equipments,
  works,
  allocations,
}) => {
  const allocItems = allocations.items;
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Allocation | undefined>();
  const [filterObra, setFilterObra] = React.useState('');
  const [filterFamily, setFilterFamily] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('Todos (Ativos)');
  const [expandedFamilies, setExpandedFamilies] = React.useState<string[]>([]);

  const dateRange = React.useMemo(() => {
    const start = startOfMonth(new Date());
    return { start, end: addMonths(start, 11) };
  }, []);
  const months = eachMonthOfInterval(dateRange);
  const worksList = works.map((w) => w.nome).sort();
  const families = uniqueFamilies(equipments);
  const stats = computeFleetStats(equipments, allocItems);

  React.useEffect(() => {
    setExpandedFamilies(uniqueFamilies(equipments));
  }, [equipments]);

  const filteredEquips = equipments.filter((eq) => {
    const matchesObra =
      !filterObra ||
      allocItems.some(
        (a) =>
          a.prefixo === eq.prefixo &&
          a.obra === filterObra &&
          (filterStatus === 'Todos' ||
            a.statusAlocacao === filterStatus ||
            (filterStatus === 'Todos (Ativos)' && a.statusAlocacao !== 'Cancelado')),
      );
    const matchesFamily = !filterFamily || eq.familia === filterFamily;
    return matchesObra && matchesFamily;
  });

  const activeAllocations = allocItems.filter((a) => {
    if (filterStatus === 'Todos') return true;
    if (filterStatus === 'Todos (Ativos)') return a.statusAlocacao !== 'Cancelado';
    return a.statusAlocacao === filterStatus;
  });

  const groupedData = families
    .map((family) => ({ family, items: filteredEquips.filter((e) => e.familia === family) }))
    .filter((g) => g.items.length > 0);

  const toggleFamily = (f: string) =>
    setExpandedFamilies((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );

  const handleSave = (alloc: Allocation) => {
    if (editing) void allocations.update(editing.id, alloc);
    else void allocations.create(alloc);
    setIsDrawerOpen(false);
    setEditing(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover permanentemente esta alocação?')) {
      void allocations.remove(id);
      setIsDrawerOpen(false);
      setEditing(undefined);
    }
  };

  const openNew = () => { setEditing(undefined); setIsDrawerOpen(true); };
  const openEdit = (alloc: Allocation) => { setEditing(alloc); setIsDrawerOpen(true); };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Planejamento"
        description="Histograma de alocação de frota por obra"
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> Planejar Alocação
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Locados" value={stats.locados} accentText="text-brand" accentBorder="border-l-brand" footer="Equipamentos em operação" />
        <StatCard label="Disponíveis" value={stats.disponiveis} accentText="text-info" accentBorder="border-l-info" footer="Prontos para alocação" />
        <StatCard label="Planejados" value={stats.planejados} accentText="text-planned" accentBorder="border-l-planned" footer="Alocações programadas" />
        <StatCard label="Em Manutenção" value={stats.manutencao} accentText="text-warning" accentBorder="border-l-warning" footer="Fora de serviço temporariamente" />
      </div>

      {/* Filtros + legenda */}
      <Card className="rounded-xl">
        <div className="px-4 py-3.5 flex flex-col md:flex-row justify-between gap-4 items-center">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setExpandedFamilies(families)}>
                <ChevronDown size={14} /> Expandir
              </Button>
              <Button variant="ghost" onClick={() => setExpandedFamilies([])} className="hover:text-red-500">
                <ChevronUp size={14} /> Recolher
              </Button>
            </div>
            <FilterSelect value={filterObra} onChange={setFilterObra} icon={Filter} placeholder="Todas as Obras" options={worksList.map((o) => ({ value: o, label: o }))} />
            <FilterSelect value={filterFamily} onChange={setFilterFamily} icon={Filter} placeholder="Todas as Famílias" options={families.map((f) => ({ value: f, label: f }))} />
            <FilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              icon={Filter}
              options={[
                { value: 'Todos (Ativos)', label: 'Todos (Ativos)' },
                { value: 'Todos', label: 'Todos' },
                { value: 'Confirmado', label: 'Confirmado' },
                { value: 'Planejado', label: 'Planejado' },
                { value: 'Cancelado', label: 'Cancelado' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-[12px] text-gray-500 font-medium whitespace-nowrap">
            <div className="flex items-center gap-2"><span className="w-2 h-2 bg-brand rounded-full" /> Atual</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 bg-planned rounded-full" /> Previsto</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 bg-gray-200 rounded-full" /> Disponível</div>
          </div>
        </div>
      </Card>

      {/* Gantt */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="sticky left-0 z-20 bg-white px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] border-r border-gray-100 min-w-[320px]">
                  Equipamento
                </th>
                {months.map((m) => (
                  <th key={m.toISOString()} className="px-4 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-center min-w-[140px] border-l border-gray-100 bg-white">
                    {format(m, 'MMM/yy', { locale: ptBR })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedData.map((group) => (
                <React.Fragment key={group.family}>
                  <tr
                    onClick={() => toggleFamily(group.family)}
                    className="bg-surface-muted cursor-pointer hover:bg-gray-100/50 transition-colors border-b border-gray-100"
                  >
                    <td className="sticky left-0 z-20 bg-inherit px-8 py-3.5 border-r border-gray-100 font-semibold text-gray-700 text-[12px] uppercase tracking-[0.05em] flex items-center gap-2.5">
                      {expandedFamilies.includes(group.family) ? (
                        <ChevronDown size={14} className="text-brand" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-500" />
                      )}
                      <span>{group.family}</span>
                      <span className="ml-auto bg-line text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-medium">
                        {group.items.length}
                      </span>
                    </td>
                    {months.map((m) => (
                      <td key={m.toISOString()} className="bg-inherit border-l border-gray-50/50" />
                    ))}
                  </tr>

                  <AnimatePresence>
                    {expandedFamilies.includes(group.family) &&
                      group.items.map((eq) => {
                        const eqAllocs = activeAllocations
                          .filter((a) => a.prefixo === eq.prefixo)
                          .sort(
                            (a, b) =>
                              new Date(a.dataMobilizacao).getTime() -
                              new Date(b.dataMobilizacao).getTime(),
                          );
                        return (
                          <motion.tr
                            key={eq.prefixo}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="group hover:bg-brand-light/45 transition-colors"
                          >
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-brand-light/40 px-8 py-4 border-b border-r border-gray-100">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[12px] font-semibold text-brand">{eq.prefixo}</span>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase">
                                    {getEquipmentLocation(eq.prefixo, allocItems)}
                                  </span>
                                </div>
                                <span className="text-[11px] text-gray-400 leading-tight">{eq.descricao}</span>
                                <div className="flex mt-1">
                                  <StatusBadge status={eq.status} className="scale-90 origin-left" />
                                </div>
                              </div>
                            </td>
                            {months.map((month) => {
                              const startM = startOfMonth(month);
                              const endM = endOfMonth(month);
                              const cellAllocs = eqAllocs.filter((a) => {
                                const mob = parseISO(a.dataMobilizacao);
                                const desmob = a.dataDesmobilizacao
                                  ? parseISO(a.dataDesmobilizacao)
                                  : null;
                                return mob <= endM && (!desmob || desmob >= startM);
                              });
                              return (
                                <td key={month.toISOString()} className="p-0 border-b border-r border-gray-100 relative group/cell">
                                  {cellAllocs.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 p-2 h-full min-h-[70px] justify-center">
                                      {cellAllocs.map((alloc) => (
                                        <motion.div
                                          key={alloc.id}
                                          onClick={() => openEdit(alloc)}
                                          className={cn(
                                            'h-7 px-2.5 rounded-md shadow-sm flex items-center justify-center cursor-pointer transition-all overflow-hidden',
                                            ALLOCATION_STATUS_STYLES[alloc.statusAlocacao].solid,
                                          )}
                                        >
                                          <span className="text-[11px] font-medium text-white uppercase tracking-[0.03em] truncate max-w-full">
                                            {alloc.obra}
                                          </span>
                                        </motion.div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-full min-h-[70px] w-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                      <Plus size={14} className="text-gray-200" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </motion.tr>
                        );
                      })}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {isDrawerOpen && (
          <Drawer
            title={editing ? 'Editar Alocação' : 'Nova Alocação'}
            subtitle="Defina os detalhes de mobilização"
            onClose={() => setIsDrawerOpen(false)}
          >
            <AllocationForm
              allocation={editing}
              equipments={equipments}
              works={works}
              onSave={handleSave}
              onCancel={() => setIsDrawerOpen(false)}
              onDelete={editing ? () => handleDelete(editing.id) : undefined}
            />
          </Drawer>
        )}
      </AnimatePresence>
    </div>
  );
};
