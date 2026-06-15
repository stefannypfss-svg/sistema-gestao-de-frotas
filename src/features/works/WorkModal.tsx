import React from 'react';
import { Work, WorkStatus } from '../../types';
import { generateId } from '../../services/repository';
import { Modal, FormField, Input, Select, Textarea, Button } from '../../components/ui';

interface WorkModalProps {
  work?: Work;
  onSave: (w: Work) => void;
  onClose: () => void;
}

const EMPTY: Work = { id: '', nome: '', cliente: '', status: 'Ativa', observacoes: '' };

export const WorkModal: React.FC<WorkModalProps> = ({ work, onSave, onClose }) => {
  const [form, setForm] = React.useState<Work>(work ?? EMPTY);
  const set = (patch: Partial<Work>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: form.id || generateId() });
  };

  return (
    <Modal
      title={work ? 'Editar Obra' : 'Nova Obra'}
      subtitle="Dados básicos do contrato"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <FormField label="Nome da Obra">
          <Input
            required
            value={form.nome}
            onChange={(e) => set({ nome: e.target.value })}
            placeholder="Ex: Rodoanel Pista Norte"
          />
        </FormField>
        <FormField label="Cliente">
          <Input value={form.cliente} onChange={(e) => set({ cliente: e.target.value })} />
        </FormField>
        <FormField label="Status">
          <Select
            value={form.status}
            onChange={(e) => set({ status: e.target.value as WorkStatus })}
          >
            <option value="Ativa">Ativa</option>
            <option value="Encerrada">Encerrada</option>
            <option value="Suspensa">Suspensa</option>
          </Select>
        </FormField>
        <FormField label="Observações">
          <Textarea
            rows={3}
            value={form.observacoes}
            onChange={(e) => set({ observacoes: e.target.value })}
          />
        </FormField>

        <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-gray-50 mt-6">
          <Button type="button" variant="ghost" onClick={onClose} className="border-none">
            Cancelar
          </Button>
          <Button type="submit" className="px-12">
            Salvar Obra
          </Button>
        </div>
      </form>
    </Modal>
  );
};
