import React from 'react';
import { Equipment, EquipmentStatus } from '../../types';
import { HOME_BASE } from '../../config/theme';
import { Modal, FormField, Input, Select, Button } from '../../components/ui';

interface EquipmentModalProps {
  equipment?: Equipment;
  onSave: (e: Equipment) => void;
  onClose: () => void;
}

const EMPTY: Equipment = {
  prefixo: '',
  grupo: 'A',
  grupoEquipamento: '',
  familia: '',
  descricao: '',
  modelo: '',
  franquia: 0,
  valorLocacao: 0,
  ano: '',
  placa: '',
  chassi: '',
  localizacaoAtual: HOME_BASE,
  status: 'Disponível',
};

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  equipment,
  onSave,
  onClose,
}) => {
  const [form, setForm] = React.useState<Equipment>(equipment ?? EMPTY);
  const set = (patch: Partial<Equipment>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal
      title={equipment ? 'Editar Equipamento' : 'Novo Equipamento'}
      subtitle="Preencha os dados técnicos"
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <form
        onSubmit={handleSubmit}
        className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <FormField label="Prefixo">
          <Input
            required
            value={form.prefixo}
            onChange={(e) => set({ prefixo: e.target.value.toUpperCase() })}
          />
        </FormField>
        <FormField label="Família">
          <Input required value={form.familia} onChange={(e) => set({ familia: e.target.value })} />
        </FormField>
        <FormField label="Modelo">
          <Input required value={form.modelo} onChange={(e) => set({ modelo: e.target.value })} />
        </FormField>
        <FormField label="Descrição" className="md:col-span-2">
          <Input
            required
            value={form.descricao}
            onChange={(e) => set({ descricao: e.target.value })}
          />
        </FormField>
        <FormField label="Ano">
          <Input required value={form.ano} onChange={(e) => set({ ano: e.target.value })} />
        </FormField>
        <FormField label="Placa">
          <Input
            value={form.placa}
            onChange={(e) => set({ placa: e.target.value.toUpperCase() })}
          />
        </FormField>
        <FormField label="Chassi">
          <Input
            value={form.chassi}
            onChange={(e) => set({ chassi: e.target.value.toUpperCase() })}
          />
        </FormField>
        <FormField label="Valor Locação (R$)">
          <Input
            type="number"
            required
            value={form.valorLocacao}
            onChange={(e) => set({ valorLocacao: Number(e.target.value) })}
            className="text-brand font-bold"
          />
        </FormField>
        <FormField label="Localização Atual">
          <Input
            required
            value={form.localizacaoAtual}
            onChange={(e) => set({ localizacaoAtual: e.target.value })}
            className="text-info"
          />
        </FormField>
        <FormField label="Status">
          <Select
            value={form.status}
            onChange={(e) => set({ status: e.target.value as EquipmentStatus })}
          >
            <option value="Disponível">Disponível</option>
            <option value="Locado">Locado</option>
            <option value="Em Manutenção">Em Manutenção</option>
            <option value="Vendido">Vendido</option>
          </Select>
        </FormField>
        <FormField label="Grupo Equipamento">
          <Input
            required
            value={form.grupoEquipamento}
            onChange={(e) => set({ grupoEquipamento: e.target.value })}
          />
        </FormField>

        <div className="md:col-span-3 pt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-gray-50 mt-6">
          <Button type="button" variant="ghost" onClick={onClose} className="border-none">
            Cancelar
          </Button>
          <Button type="submit" className="px-12">
            Salvar Equipamento
          </Button>
        </div>
      </form>
    </Modal>
  );
};
