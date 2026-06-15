import React from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Work } from '../../types';
import { cn } from '../../lib/utils';
import { WORK_STATUS_STYLES } from '../../config/theme';
import { Collection } from '../../hooks/useCollection';
import { PageHeader, Button, Card, StateMessage } from '../../components/ui';
import { WorkModal } from './WorkModal';

interface WorksViewProps {
  works: Collection<Work>;
}

export const WorksView: React.FC<WorksViewProps> = ({ works }) => {
  const { items, loading, error } = works;
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Work | undefined>();

  const handleSave = (work: Work) => {
    if (editing) {
      void works.update(editing.id, work);
    } else {
      void works.create(work);
    }
    setIsModalOpen(false);
    setEditing(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover esta obra?')) {
      void works.remove(id);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Obras"
        description="Gerencie obras e clientes"
        action={
          <Button onClick={() => { setEditing(undefined); setIsModalOpen(true); }}>
            <Plus size={16} /> Nova Obra
          </Button>
        }
      />

      <Card>
        {loading ? (
          <StateMessage>Carregando obras…</StateMessage>
        ) : error ? (
          <StateMessage>Erro ao carregar: {error}</StateMessage>
        ) : items.length === 0 ? (
          <StateMessage>Nenhuma obra cadastrada.</StateMessage>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  {['Nome da Obra', 'Cliente', 'Status', 'Observações'].map((h) => (
                    <th
                      key={h}
                      className="px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((w) => (
                  <tr key={w.id} className="hover:bg-brand-light transition-colors group">
                    <td className="px-8 py-4 text-[14px] font-medium text-brand">{w.nome}</td>
                    <td className="px-8 py-4 text-[13px] text-gray-500">{w.cliente || '—'}</td>
                    <td className="px-8 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-[10px] py-[3px] rounded-full text-[12px] font-medium leading-none',
                          WORK_STATUS_STYLES[w.status].chip,
                        )}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-[13px] text-gray-500 italic max-w-xs truncate">
                      {w.observacoes || '—'}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setEditing(w); setIsModalOpen(true); }}
                          title="Editar"
                          className="w-7 h-7 border border-line rounded-md flex items-center justify-center bg-white cursor-pointer text-gray-500 hover:bg-surface-muted hover:text-brand transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          title="Excluir"
                          className="w-7 h-7 border border-line rounded-md flex items-center justify-center bg-white cursor-pointer text-gray-500 hover:bg-surface-muted hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <WorkModal
          work={editing}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
};
