import { useState } from 'react';
import { EquipamentoObra, SituacaoEquipamento, Work, Equipment } from '../../types';
import { Modal, Button } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Props {
  record?: EquipamentoObra;
  equipments: Equipment[];
  works: Work[];
  onSave: (r: EquipamentoObra) => void;
  onClose: () => void;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';

function EMPTY(prefixo = '', obra = ''): EquipamentoObra {
  return { id: '', prefixo, obra, situacao: 'Desmobilizado' };
}

export function EquipamentoObraModal({ record, equipments, works, onSave, onClose }: Props) {
  const isNew = !record;
  const [form, setForm] = useState<EquipamentoObra>(record ? { ...record } : EMPTY());
  const [error, setError] = useState('');

  function set(patch: Partial<EquipamentoObra>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleDateChange(field: 'dataMobilizacao' | 'dataDesmobilizacao' | 'dataEnvio', value: string) {
    const patch: Partial<EquipamentoObra> = { [field]: value };
    if (field === 'dataMobilizacao' && value) patch.situacao = 'Mobilizado';
    if (field === 'dataDesmobilizacao' && value) patch.situacao = 'Desmobilizado';
    if (field === 'dataEnvio' && value) patch.situacao = 'Desmobilizado';
    set(patch);
  }

  function handleSave() {
    if (!form.prefixo.trim()) { setError('Prefixo é obrigatório.'); return; }
    if (!form.obra.trim()) { setError('Obra é obrigatória.'); return; }
    const id = isNew ? `${form.prefixo}-${Date.now()}` : form.id;
    onSave({ ...form, id });
    onClose();
  }

  const situacaoColor = form.situacao === 'Mobilizado'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <Modal
      title={isNew ? 'Adicionar Registro' : `Editar — ${record!.prefixo}`}
      subtitle={isNew ? 'Preencha prefixo e obra (obrigatórios)' : record!.obra}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Prefixo */}
          <Field label="Prefixo" required>
            {isNew ? (
              <select
                value={form.prefixo}
                onChange={(e) => set({ prefixo: e.target.value })}
                className={inputCls}
              >
                <option value="">Selecione...</option>
                {equipments
                  .slice()
                  .sort((a, b) => a.prefixo.localeCompare(b.prefixo))
                  .map((eq) => (
                    <option key={eq.prefixo} value={eq.prefixo}>
                      {eq.prefixo} — {eq.descricao}
                    </option>
                  ))}
              </select>
            ) : (
              <input value={form.prefixo} readOnly className={cn(inputCls, 'bg-gray-50 text-gray-400 cursor-default')} />
            )}
          </Field>

          {/* Obra */}
          <Field label="Obra" required>
            <select
              value={form.obra}
              onChange={(e) => set({ obra: e.target.value })}
              className={inputCls}
            >
              <option value="">Selecione a obra...</option>
              {works.map((w) => (
                <option key={w.id} value={w.nome}>{w.nome}</option>
              ))}
              {/* Manter valor existente se não for obra cadastrada */}
              {form.obra && !works.find((w) => w.nome === form.obra) && (
                <option value={form.obra}>{form.obra}</option>
              )}
            </select>
          </Field>

          {/* Data Recebimento */}
          <Field label="Data de Recebimento">
            <input
              type="date"
              value={form.dataRecebimento ?? ''}
              onChange={(e) => set({ dataRecebimento: e.target.value })}
              className={inputCls}
            />
          </Field>

          {/* Data Liberação Mecânica */}
          <Field label="Data de Liberação Mecânica">
            <input
              type="date"
              value={form.dataLiberacaoMecanica ?? ''}
              onChange={(e) => set({ dataLiberacaoMecanica: e.target.value })}
              className={inputCls}
            />
          </Field>

          {/* Data Mobilização */}
          <Field label="Data de Mobilização">
            <input
              type="date"
              value={form.dataMobilizacao ?? ''}
              onChange={(e) => handleDateChange('dataMobilizacao', e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Data Desmobilização */}
          <Field label="Data de Desmobilização">
            <input
              type="date"
              value={form.dataDesmobilizacao ?? ''}
              onChange={(e) => handleDateChange('dataDesmobilizacao', e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Data Envio */}
          <Field label="Data de Envio">
            <input
              type="date"
              value={form.dataEnvio ?? ''}
              onChange={(e) => handleDateChange('dataEnvio', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Situação calculada */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Situação resultante:</span>
          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border', situacaoColor)}>
            {form.situacao}
          </span>
          {(form.dataMobilizacao || form.dataDesmobilizacao || form.dataEnvio) && (
            <span className="text-[11px] text-gray-400">
              {form.dataMobilizacao && !form.dataDesmobilizacao && !form.dataEnvio
                ? '(definida pela data de mobilização)'
                : '(definida pela data de desmobilização / envio)'}
            </span>
          )}
        </div>

        {/* Situação manual (quando nenhuma data define) */}
        {!form.dataMobilizacao && !form.dataDesmobilizacao && !form.dataEnvio && (
          <Field label="Situação">
            <select
              value={form.situacao}
              onChange={(e) => set({ situacao: e.target.value as SituacaoEquipamento })}
              className={inputCls}
            >
              <option value="Mobilizado">Mobilizado</option>
              <option value="Desmobilizado">Desmobilizado</option>
            </select>
          </Field>
        )}

        {/* Observação */}
        <Field label="Observação">
          <textarea
            value={form.observacao ?? ''}
            onChange={(e) => set({ observacao: e.target.value })}
            rows={3}
            className={cn(inputCls, 'resize-none')}
            placeholder="Observações adicionais..."
          />
        </Field>
      </div>

      <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave}>Salvar</Button>
      </div>
    </Modal>
  );
}
