import React, { useState } from 'react';
import { Equipment, SituacaoEquipamento, StatusOperacional } from '../../types';
import { Modal, Button } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Props {
  equipment: Equipment;
  onSave: (e: Equipment) => void;
  onClose: () => void;
}

type Tab = 'identificacao' | 'documentacao' | 'financeiro' | 'operacional';
const TABS: { key: Tab; label: string }[] = [
  { key: 'identificacao', label: 'Identificação' },
  { key: 'documentacao', label: 'Documentação' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'operacional', label: 'Operacional' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={cn(
        'w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand',
        readOnly && 'bg-gray-50 text-gray-400 cursor-default',
      )}
    />
  );
}

function Sel({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function TechnicalEditModal({ equipment, onSave, onClose }: Props) {
  const [form, setForm] = useState<Equipment>({ ...equipment });
  const [tab, setTab] = useState<Tab>('identificacao');

  function set(patch: Partial<Equipment>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    onSave(form);
    onClose();
  }

  return (
    <Modal
      title={`Editar ${equipment.prefixo}`}
      subtitle={equipment.descricao}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-gray-100 bg-white">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-all',
              tab === t.key
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-400 hover:text-gray-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'identificacao' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prefixo">
              <Input value={form.prefixo} onChange={(v) => set({ prefixo: v })} readOnly />
            </Field>
            <Field label="Grupo">
              <Input value={form.grupo} onChange={(v) => set({ grupo: v })} placeholder="A, C Inácio..." />
            </Field>
            <Field label="Grupo de Equipamentos">
              <Input value={form.grupoEquipamento} onChange={(v) => set({ grupoEquipamento: v })} />
            </Field>
            <Field label="Família">
              <Input value={form.familia} onChange={(v) => set({ familia: v })} />
            </Field>
            <div className="col-span-2">
              <Field label="Descrição">
                <Input value={form.descricao} onChange={(v) => set({ descricao: v })} />
              </Field>
            </div>
            <Field label="Marca">
              <Input value={form.marca ?? ''} onChange={(v) => set({ marca: v })} />
            </Field>
            <Field label="Modelo">
              <Input value={form.modelo} onChange={(v) => set({ modelo: v })} />
            </Field>
            <Field label="Ano">
              <Input value={form.ano} onChange={(v) => set({ ano: v })} placeholder="2020 / 2021" />
            </Field>
            <Field label="Info do Implemento">
              <Input value={form.infoImplemento ?? ''} onChange={(v) => set({ infoImplemento: v })} placeholder="Ex: 6.000 Litros" />
            </Field>
          </div>
        )}

        {tab === 'documentacao' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Placa">
              <Input value={form.placa} onChange={(v) => set({ placa: v.toUpperCase() })} />
            </Field>
            <Field label="RENAVAM">
              <Input value={form.renavam ?? ''} onChange={(v) => set({ renavam: v })} />
            </Field>
            <div className="col-span-2">
              <Field label="Chassi / Nº de Série">
                <Input value={form.chassi} onChange={(v) => set({ chassi: v.toUpperCase() })} />
              </Field>
            </div>
            <Field label="Nº Nota Fiscal">
              <Input value={form.nNotaFiscal ?? ''} onChange={(v) => set({ nNotaFiscal: v })} />
            </Field>
            <Field label="Data de Compra">
              <Input value={form.dataCompra ?? ''} onChange={(v) => set({ dataCompra: v })} placeholder="DD/MM/AAAA" />
            </Field>
            <div className="col-span-2">
              <Field label="Fornecedor">
                <Input value={form.fornecedor ?? ''} onChange={(v) => set({ fornecedor: v })} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Empresa Aquisidora">
                <Input value={form.empresaAquisidora ?? ''} onChange={(v) => set({ empresaAquisidora: v })} />
              </Field>
            </div>
            <Field label="Tipo de Contrato">
              <Sel
                value={form.tipoContrato ?? ''}
                onChange={(v) => set({ tipoContrato: v })}
                options={['', 'Mensal', 'Horas', 'Produção']}
              />
            </Field>
          </div>
        )}

        {tab === 'financeiro' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor de Locação 2024 (R$)">
              <Input type="number" value={form.valorLocacao} onChange={(v) => set({ valorLocacao: Number(v) })} />
            </Field>
            <Field label="Mínima Contratual (horas)">
              <Input type="number" value={form.franquia} onChange={(v) => set({ franquia: Number(v) })} />
            </Field>
            <Field label="Valor de Compra (R$)">
              <Input type="number" value={form.valorCompra ?? 0} onChange={(v) => set({ valorCompra: Number(v) })} />
            </Field>
            <Field label="Valor Anúncio Venda (R$)">
              <Input type="number" value={form.valorAnuncioVenda ?? 0} onChange={(v) => set({ valorAnuncioVenda: Number(v) })} />
            </Field>
            <Field label="Valor de Mercado (R$)">
              <Input type="number" value={form.valorMercado ?? 0} onChange={(v) => set({ valorMercado: Number(v) })} />
            </Field>
            <Field label="Tempo de Depreciação (anos)">
              <Input type="number" value={form.tempoDepreciacao ?? 0} onChange={(v) => set({ tempoDepreciacao: Number(v) })} />
            </Field>
          </div>
        )}

        {tab === 'operacional' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Localização Atual">
              <Input value={form.localizacaoAtual} onChange={(v) => set({ localizacaoAtual: v })} />
            </Field>
            <Field label="Status Geral">
              <Sel
                value={form.statusGeral ?? ''}
                onChange={(v) => set({ statusGeral: v })}
                options={['', 'A disposição', 'A Venda', 'Uso interno']}
              />
            </Field>
            <Field label="Situação">
              <Sel
                value={form.situacao}
                onChange={(v) => set({ situacao: v as SituacaoEquipamento })}
                options={['Mobilizado', 'Desmobilizado']}
              />
            </Field>
            <Field label="Status Operacional">
              <Sel
                value={form.statusOperacional}
                onChange={(v) => set({ statusOperacional: v as StatusOperacional })}
                options={['Operação', 'Disponível', 'Manutenção']}
              />
            </Field>
            <Field label="Previsão de Liberação">
              <Input value={form.previsaoLiberacao ?? ''} onChange={(v) => set({ previsaoLiberacao: v })} placeholder="DD/MM/AAAA ou AGUARDANDO" />
            </Field>
            <Field label="Previsão de Mobilização">
              <Input value={form.previsaoMobilizacao ?? ''} onChange={(v) => set({ previsaoMobilizacao: v })} placeholder="DD/MM/AAAA ou AGUARDANDO" />
            </Field>
            <div className="col-span-2">
              <Field label="Ação">
                <Input value={form.acao ?? ''} onChange={(v) => set({ acao: v })} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Observações">
                <textarea
                  value={form.obs ?? ''}
                  onChange={(e) => set({ obs: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave}>Salvar</Button>
      </div>
    </Modal>
  );
}
