import React from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Slash } from 'lucide-react';
import { Allocation, Equipment, Work } from '../../types';
import { cn } from '../../lib/utils';
import { ALLOCATION_STATUS_STYLES } from '../../config/theme';
import { generateId } from '../../services/repository';
import { FieldLabel } from '../../components/ui';

interface AllocationFormProps {
  allocation?: Partial<Allocation>;
  equipments: Equipment[];
  works: Work[];
  onSave: (a: Allocation) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const toInputDate = (iso?: string | null) =>
  iso ? format(parseISO(iso), 'yyyy-MM-dd') : '';
const toISO = (value: string) => (value ? new Date(value).toISOString() : '');

type FormErrors = { prefixo?: string; obra?: string; dataMobilizacao?: string };

export const AllocationForm: React.FC<AllocationFormProps> = ({
  allocation,
  equipments,
  works,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [form, setForm] = React.useState<Partial<Allocation>>({
    tipo: 'Atual',
    obra: '',
    obraId: '',
    statusAlocacao: 'Confirmado',
    prefixo: '',
    dataMobilizacao: new Date().toISOString(),
    dataDesmobilizacao: null,
    dataMobilizacaoReal: null,
    dataDesmobilizacaoReal: null,
    valorLocacao: 0,
    observacoes: '',
    ...allocation,
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const set = (patch: Partial<Allocation>) => setForm((f) => ({ ...f, ...patch }));

  const isConfirmed = form.statusAlocacao === 'Confirmado';
  const isCancelled = form.statusAlocacao === 'Cancelado';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (!form.prefixo) next.prefixo = 'Equipamento é obrigatório';
    if (!form.obra) next.obra = 'Obra destino é obrigatória';
    if (form.tipo === 'Previsto' && !form.dataMobilizacao)
      next.dataMobilizacao = 'Data prevista é obrigatória';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onSave({
      ...form,
      id: form.id || generateId(),
      statusAlocacao:
        form.statusAlocacao || (form.tipo === 'Previsto' ? 'Planejado' : 'Confirmado'),
    } as Allocation);
  };

  const handleConfirmRealization = () => {
    const next = {
      ...form,
      statusAlocacao: 'Confirmado' as const,
      dataMobilizacaoReal: form.dataMobilizacaoReal || new Date().toISOString(),
    } as Allocation;
    if (form.id) onSave(next);
    else setForm(next);
  };

  const handleCancelPlanning = () => {
    if (confirm('Deseja cancelar este planejamento?')) {
      onSave({ ...(form as Allocation), statusAlocacao: 'Cancelado' });
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      <div className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-50">
        <FieldLabel className="ml-0">Status da Alocação</FieldLabel>
        <div
          className={cn(
            'px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest',
            form.statusAlocacao && ALLOCATION_STATUS_STYLES[form.statusAlocacao].chip,
          )}
        >
          {form.statusAlocacao}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Equipamento</FieldLabel>
        <select
          required
          disabled={!!allocation?.id}
          value={form.prefixo}
          onChange={(e) => {
            const eq = equipments.find((x) => x.prefixo === e.target.value);
            set({ prefixo: e.target.value, valorLocacao: eq?.valorLocacao ?? 0 });
            if (errors.prefixo) setErrors({ ...errors, prefixo: undefined });
          }}
          className={cn(
            'w-full px-4 py-4 bg-white rounded-full border shadow-sm outline-none font-semibold text-gray-900 appearance-none focus:ring-4 focus:ring-brand/5',
            errors.prefixo ? 'border-red-500' : 'border-gray-100',
          )}
        >
          <option value="">Selecione o prefixo...</option>
          {equipments.map((eq) => (
            <option key={eq.prefixo} value={eq.prefixo}>
              {eq.prefixo} — {eq.familia}
            </option>
          ))}
        </select>
        {errors.prefixo && <p className="text-[10px] font-semibold text-red-500 ml-1">{errors.prefixo}</p>}
      </div>

      <div className="space-y-2">
        <FieldLabel>Obra Destino</FieldLabel>
        <select
          required
          value={form.obraId || ''}
          onChange={(e) => {
            const work = works.find((w) => w.id === e.target.value);
            set({ obraId: e.target.value, obra: work?.nome ?? '' });
            if (errors.obra) setErrors({ ...errors, obra: undefined });
          }}
          className={cn(
            'w-full px-4 py-4 bg-white rounded-full border shadow-sm outline-none font-semibold text-gray-900 appearance-none focus:ring-4 focus:ring-info/10',
            errors.obra ? 'border-red-500' : 'border-gray-100',
          )}
        >
          <option value="">Selecione a obra...</option>
          {works.map((w) => (
            <option key={w.id} value={w.id}>
              {w.nome}
            </option>
          ))}
        </select>
        {errors.obra && <p className="text-[10px] font-semibold text-red-500 ml-1">{errors.obra}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldLabel>Tipo</FieldLabel>
          <select
            value={form.tipo}
            onChange={(e) => {
              const tipo = e.target.value as Allocation['tipo'];
              set({ tipo, statusAlocacao: tipo === 'Previsto' ? 'Planejado' : 'Confirmado' });
            }}
            className="w-full px-4 py-4 bg-white rounded-full border border-gray-100 shadow-sm outline-none font-semibold appearance-none"
          >
            <option value="Atual">Atual</option>
            <option value="Previsto">Previsto</option>
          </select>
        </div>
        <div className="space-y-2">
          <FieldLabel>Locação (R$)</FieldLabel>
          <input
            type="number"
            required
            value={form.valorLocacao}
            onChange={(e) => set({ valorLocacao: Number(e.target.value) })}
            className="w-full px-4 py-4 bg-white rounded-full border border-gray-100 shadow-sm outline-none font-bold text-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-gray-50 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-planned uppercase tracking-widest block mb-2">
              Previsto
            </span>
            <div className="space-y-2">
              <FieldLabel className="ml-0 text-[9px]">Mobilização</FieldLabel>
              <input
                type="date"
                required={form.tipo === 'Previsto'}
                value={toInputDate(form.dataMobilizacao)}
                onChange={(e) => {
                  set({ dataMobilizacao: toISO(e.target.value) });
                  if (errors.dataMobilizacao) setErrors({ ...errors, dataMobilizacao: undefined });
                }}
                className={cn(
                  'w-full px-3 py-2 bg-surface-subtle rounded-full outline-none text-sm font-semibold',
                  errors.dataMobilizacao ? 'border border-red-500' : 'border-none',
                )}
              />
              {errors.dataMobilizacao && (
                <p className="text-[9px] font-semibold text-red-500">{errors.dataMobilizacao}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-planned uppercase tracking-widest invisible block mb-2">
              Previsto
            </span>
            <div className="space-y-2">
              <FieldLabel className="ml-0 text-[9px]">Desmobilização</FieldLabel>
              <input
                type="date"
                value={toInputDate(form.dataDesmobilizacao)}
                onChange={(e) =>
                  set({ dataDesmobilizacao: e.target.value ? toISO(e.target.value) : null })
                }
                className="w-full px-3 py-2 bg-surface-subtle border-none rounded-full outline-none text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        {isConfirmed && (
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-dashed border-gray-100">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest block mb-2">
                Realizado
              </span>
              <div className="space-y-2">
                <FieldLabel className="ml-0 text-[9px]">Mobilização</FieldLabel>
                <input
                  type="date"
                  required
                  value={toInputDate(form.dataMobilizacaoReal)}
                  onChange={(e) => set({ dataMobilizacaoReal: toISO(e.target.value) })}
                  className="w-full px-3 py-2 bg-brand-light border-none rounded-lg outline-none text-sm font-bold text-brand"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest invisible block mb-2">
                Realizado
              </span>
              <div className="space-y-2">
                <FieldLabel className="ml-0 text-[9px]">Desmobilização</FieldLabel>
                <input
                  type="date"
                  value={toInputDate(form.dataDesmobilizacaoReal)}
                  onChange={(e) =>
                    set({ dataDesmobilizacaoReal: e.target.value ? toISO(e.target.value) : null })
                  }
                  className="w-full px-3 py-2 bg-brand-light border-none rounded-lg outline-none text-sm font-bold text-brand"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel>Observações</FieldLabel>
        <textarea
          rows={3}
          value={form.observacoes}
          onChange={(e) => set({ observacoes: e.target.value })}
          className="w-full px-4 py-4 bg-white rounded-xl border border-gray-100 shadow-sm outline-none font-semibold resize-none focus:ring-4 focus:ring-gray-100"
        />
      </div>

      <div className="pt-8 space-y-4">
        {!isConfirmed && !isCancelled && (
          <button
            type="button"
            onClick={handleConfirmRealization}
            className="w-full py-5 text-xs font-bold uppercase tracking-widest text-brand bg-brand-light hover:brightness-95 rounded-full border border-brand-border transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} /> Confirmar Realização
          </button>
        )}

        <button
          type="submit"
          className="w-full py-5 text-xs font-bold uppercase tracking-widest text-white bg-brand rounded-full shadow-xl shadow-green-900/10 hover:scale-[1.01] transition-all"
        >
          {allocation?.id ? 'Salvar Alterações' : 'Confirmar Alocação'}
        </button>

        {!isCancelled && form.id && (
          <button
            type="button"
            onClick={handleCancelPlanning}
            className="w-full py-4 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-full transition-all flex items-center justify-center gap-2"
          >
            <Slash size={14} /> Cancelar Planejamento
          </button>
        )}

        <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:bg-gray-50 rounded-full transition-all"
          >
            Fechar
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-red-500 rounded-full transition-all"
            >
              Excluir Permanente
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
