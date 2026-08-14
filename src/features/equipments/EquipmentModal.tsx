import React from 'react';
import { Equipment, SituacaoEquipamento, StatusOperacional } from '../../types';
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
  situacao: 'Desmobilizado',
  statusOperacional: 'Disponível',
  ativo: true,
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
        <FormField label="Grupo Equipamento">
          <Input
            required
            value={form.grupoEquipamento}
            onChange={(e) => set({ grupoEquipamento: e.target.value })}
          />
        </FormField>

        {/* ── Classificação operacional ─────────────────────────── */}
        <FormField label="Situação">
          <Select
            value={form.situacao}
            onChange={(e) => set({ situacao: e.target.value as SituacaoEquipamento })}
          >
            <option value="Mobilizado">Mobilizado — em obra</option>
            <option value="Desmobilizado">Desmobilizado — na base</option>
          </Select>
        </FormField>
        <FormField label="Status Operacional">
          <Select
            value={form.statusOperacional}
            onChange={(e) => set({ statusOperacional: e.target.value as StatusOperacional })}
          >
            <option value="Operação">Operação</option>
            <option value="Disponível">Disponível</option>
            <option value="Manutenção">Manutenção</option>
          </Select>
        </FormField>

        {/* ── Ativação / desativação ────────────────────────────── */}
        <div className="md:col-span-3 flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
          <button
            type="button"
            role="switch"
            aria-checked={form.ativo}
            onClick={() => set({ ativo: !form.ativo })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              form.ativo ? 'bg-brand' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                form.ativo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-gray-800">
              {form.ativo ? 'Equipamento Ativo' : 'Equipamento Inativo'}
            </span>
            <span className="text-[12px] text-gray-500">
              {form.ativo
                ? 'Visível em todas as listas e relatórios'
                : 'Desativado — não aparece no planejamento nem na receita'}
            </span>
          </div>
        </div>

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
