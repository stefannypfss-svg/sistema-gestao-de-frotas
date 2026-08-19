import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, X, Check, Download } from 'lucide-react';
import {
  Equipment, Work, AvariaIncidente, AvariaMaterial,
  AvaliacaoCortezEngenharia,
} from '../../types';
import { Collection } from '../../hooks/useCollection';
import { PageHeader, Button, StateMessage } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Props {
  equipments: Collection<Equipment>;
  works: Collection<Work>;
  avarias: Collection<AvariaIncidente>;
}

// ─── Helpers ────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function calcSubtotal(m: AvariaMaterial): number | null {
  if (m.valorUnitario === null) return null;
  return round2(m.valorUnitario * (m.qtd ?? 1) * (m.fator ?? 1));
}

function calcTotalGasto(subtotal: number | null, pct: number): number | null {
  if (subtotal === null) return null;
  const divisor = 1 - pct / 100;
  if (divisor <= 0) return null;
  return round2(subtotal / divisor);
}

function fmtBRL(v: number | null): string {
  if (v === null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function fmtDate(s: string): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Avaliação config ────────────────────────────────────────────────

const AVALIACAO_CONFIG: Record<AvaliacaoCortezEngenharia, { label: string; bg: string; text: string }> = {
  'Pendente':                                        { label: 'Pendente',                                  bg: 'bg-amber-100',  text: 'text-amber-800'  },
  'Aprovado para inclusão na medição':               { label: 'Aprov. Medição',                            bg: 'bg-blue-100',   text: 'text-blue-800'   },
  'Aprovado para compra pela Cortez Engenharia':     { label: 'Aprov. Compra',                             bg: 'bg-green-100',  text: 'text-green-800'  },
  'Reprovado':                                       { label: 'Reprovado',                                 bg: 'bg-red-100',    text: 'text-red-800'    },
  '':                                                { label: '—',                                         bg: 'bg-gray-50',    text: 'text-gray-400'   },
};

const AVALIACAO_OPTIONS: AvaliacaoCortezEngenharia[] = [
  'Pendente',
  'Aprovado para inclusão na medição',
  'Aprovado para compra pela Cortez Engenharia',
  'Reprovado',
];

// ─── Form types ──────────────────────────────────────────────────────

interface MatForm {
  id: string;
  material: string;
  qtd: string;
  fator: string;
  valorUnitario: string;
  percentualBitributacao: string;
}

interface IncidenteForm {
  prefixo: string;
  obra: string;
  dataSinistro: string;
  descricao: string;
  materiais: MatForm[];
  relatorioEnviado: 'Sim' | 'Não' | '';
  dataEnvioRelatorio: string;
  avaliacaoCortez: AvaliacaoCortezEngenharia;
  valorAprovado: string;
  observacao: string;
}

const emptyMat = (): MatForm => ({
  id: uid(), material: '', qtd: '', fator: '', valorUnitario: '', percentualBitributacao: '14.58',
});

const emptyForm = (): IncidenteForm => ({
  prefixo: '', obra: '', dataSinistro: '', descricao: '',
  materiais: [emptyMat()],
  relatorioEnviado: '', dataEnvioRelatorio: '',
  avaliacaoCortez: 'Pendente', valorAprovado: '', observacao: '',
});

function formToIncidente(f: IncidenteForm, id: string): AvariaIncidente {
  return {
    id,
    prefixo:    f.prefixo,
    obra:       f.obra,
    dataSinistro: f.dataSinistro,
    descricao:  f.descricao,
    materiais:  f.materiais.map((m) => ({
      id: m.id,
      material: m.material,
      qtd: m.qtd !== '' ? Number(m.qtd) : null,
      fator: m.fator !== '' ? Number(m.fator) : null,
      valorUnitario: m.valorUnitario !== '' ? Number(m.valorUnitario) : null,
      percentualBitributacao: m.percentualBitributacao !== '' ? Number(m.percentualBitributacao) : 14.58,
    })),
    relatorioEnviado: f.relatorioEnviado,
    dataEnvioRelatorio: f.dataEnvioRelatorio,
    avaliacaoCortez: f.avaliacaoCortez,
    valorAprovado: f.valorAprovado !== '' ? Number(f.valorAprovado) : null,
    observacao: f.observacao,
  };
}

function incidenteToForm(inc: AvariaIncidente): IncidenteForm {
  return {
    prefixo:    inc.prefixo,
    obra:       inc.obra,
    dataSinistro: inc.dataSinistro,
    descricao:  inc.descricao,
    materiais:  inc.materiais.length > 0
      ? inc.materiais.map((m) => ({
          id: m.id,
          material: m.material,
          qtd: m.qtd !== null ? String(m.qtd) : '',
          fator: m.fator !== null ? String(m.fator) : '',
          valorUnitario: m.valorUnitario !== null ? String(m.valorUnitario) : '',
          percentualBitributacao: String(m.percentualBitributacao),
        }))
      : [emptyMat()],
    relatorioEnviado: inc.relatorioEnviado,
    dataEnvioRelatorio: inc.dataEnvioRelatorio,
    avaliacaoCortez: inc.avaliacaoCortez,
    valorAprovado: inc.valorAprovado !== null ? String(inc.valorAprovado) : '',
    observacao: inc.observacao,
  };
}

// ─── Main Component ──────────────────────────────────────────────────

export function ControleAvariasView({ equipments, works, avarias }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalId, setModalId]   = useState<string | null>(null); // null = closed
  const [isNew, setIsNew]       = useState(false);
  const [form, setForm]         = useState<IncidenteForm>(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function exportCSV() {
    const headers = [
      'Prefixo', 'Obra', 'Data Sinistro', 'Descrição',
      'Material', 'Qtd', 'Fator', 'Valor Unitário',
      'Subtotal Material', '% Bitributação', 'Total Material Gasto',
      'Relatório Enviado', 'Data Envio', 'Avaliação Cortez Engenharia',
      'Valor Aprovado', 'Observação',
    ];

    const dataRows: string[][] = [];
    for (const inc of sorted) {
      if (inc.materiais.length === 0) {
        dataRows.push([
          inc.prefixo, inc.obra, fmtDate(inc.dataSinistro), inc.descricao,
          '', '', '', '', '', '', '',
          inc.relatorioEnviado, fmtDate(inc.dataEnvioRelatorio), inc.avaliacaoCortez,
          inc.valorAprovado !== null ? String(inc.valorAprovado) : '', inc.observacao,
        ]);
      } else {
        for (const m of inc.materiais) {
          const sub   = calcSubtotal(m);
          const total = calcTotalGasto(sub, m.percentualBitributacao);
          dataRows.push([
            inc.prefixo, inc.obra, fmtDate(inc.dataSinistro), inc.descricao,
            m.material,
            m.qtd !== null ? String(m.qtd) : '',
            m.fator !== null ? String(m.fator) : '',
            m.valorUnitario !== null ? String(m.valorUnitario).replace('.', ',') : '',
            sub !== null ? String(sub).replace('.', ',') : '',
            String(m.percentualBitributacao).replace('.', ','),
            total !== null ? String(total).replace('.', ',') : '',
            inc.relatorioEnviado, fmtDate(inc.dataEnvioRelatorio), inc.avaliacaoCortez,
            inc.valorAprovado !== null ? String(inc.valorAprovado).replace('.', ',') : '',
            inc.observacao,
          ]);
        }
      }
    }

    const csv = [headers, ...dataRows].map((r) => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `controle_avarias_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const prefixos = useMemo(
    () => [...new Set(equipments.items.map((e) => e.prefixo))].sort(),
    [equipments.items],
  );
  const obras = useMemo(
    () => works.items.map((w) => w.nome).sort(),
    [works.items],
  );

  const sorted = useMemo(
    () => [...avarias.items].sort((a, b) => b.dataSinistro.localeCompare(a.dataSinistro)),
    [avarias.items],
  );

  // ── Toggle expand ──
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // ── Open modal ──
  function openNew() {
    setForm(emptyForm());
    setModalId(uid());
    setIsNew(true);
  }
  function openEdit(inc: AvariaIncidente) {
    setForm(incidenteToForm(inc));
    setModalId(inc.id);
    setIsNew(false);
  }
  function closeModal() { setModalId(null); }

  // ── Save ──
  async function handleSave() {
    if (!form.prefixo || !form.obra) return;
    setSaving(true);
    try {
      const inc = formToIncidente(form, modalId!);
      if (isNew) {
        await avarias.create(inc);
      } else {
        await avarias.update(modalId!, inc);
      }
    } finally {
      setSaving(false);
      closeModal();
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    await avarias.remove(id);
    setConfirmDelete(null);
  }

  // ── Form helpers ──
  function setField<K extends keyof IncidenteForm>(k: K, v: IncidenteForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setMat(idx: number, patch: Partial<MatForm>) {
    setForm((f) => {
      const mats = [...f.materiais];
      mats[idx] = { ...mats[idx], ...patch };
      return { ...f, materiais: mats };
    });
  }
  function addMat() {
    setForm((f) => ({ ...f, materiais: [...f.materiais, emptyMat()] }));
  }
  function removeMat(idx: number) {
    setForm((f) => ({ ...f, materiais: f.materiais.filter((_, i) => i !== idx) }));
  }

  // ── Preview calcs in form ──
  function previewSubtotal(m: MatForm): number | null {
    if (!m.valorUnitario) return null;
    const vu = Number(m.valorUnitario);
    const q  = m.qtd !== '' ? Number(m.qtd) : 1;
    const f  = m.fator !== '' ? Number(m.fator) : 1;
    return isNaN(vu) ? null : round2(vu * q * f);
  }
  function previewTotal(m: MatForm): number | null {
    const sub = previewSubtotal(m);
    const pct = m.percentualBitributacao !== '' ? Number(m.percentualBitributacao) : 14.58;
    return calcTotalGasto(sub, pct);
  }

  const inputCls = 'h-8 px-2 text-[12px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand w-full';
  const thCls    = 'px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-left';
  const tdCls    = 'px-3 py-2 text-[12px] text-gray-700 whitespace-nowrap';

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <PageHeader
        title="Controle de Avarias"
        description="Registro e acompanhamento de sinistros e materiais"
        action={
          <div className="flex items-center gap-2">
            <Button onClick={exportCSV} disabled={sorted.length === 0}>
              <Download size={15} /> Exportar CSV
            </Button>
            <Button variant="primary" onClick={openNew}>
              <Plus size={15} /> Nova Avaria
            </Button>
          </div>
        }
      />

      {/* Tabela */}
      {avarias.loading ? (
        <StateMessage>Carregando…</StateMessage>
      ) : sorted.length === 0 ? (
        <StateMessage>Nenhuma avaria registrada. Clique em "Nova Avaria" para começar.</StateMessage>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left" style={{ minWidth: 1400 }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={cn(thCls, 'w-8')} />
                  <th className={thCls}>Prefixo</th>
                  <th className={thCls}>Obra</th>
                  <th className={thCls}>Data Sinistro</th>
                  <th className={cn(thCls, 'min-w-[180px]')}>Descrição</th>
                  <th className={thCls}>Itens</th>
                  <th className={thCls}>Total Gasto</th>
                  <th className={thCls}>Rel. Enviado</th>
                  <th className={thCls}>Data Envio</th>
                  <th className={cn(thCls, 'min-w-[160px]')}>Avaliação</th>
                  <th className={thCls}>Valor Aprovado</th>
                  <th className={cn(thCls, 'min-w-[160px]')}>Observação</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((inc) => {
                  const isExp   = expanded.has(inc.id);
                  const totalSum = inc.materiais.reduce<number>((s, m) => {
                    const t = calcTotalGasto(calcSubtotal(m), m.percentualBitributacao);
                    return s + (t ?? 0);
                  }, 0);
                  const avcfg = AVALIACAO_CONFIG[inc.avaliacaoCortez];

                  return (
                    <React.Fragment key={inc.id}>
                      {/* ── Summary row ── */}
                      <tr className={cn('border-b border-gray-100 hover:bg-gray-50/50 transition-colors', isExp && 'bg-blue-50/30')}>
                        <td className="px-2 py-2 w-8">
                          <button
                            onClick={() => toggleExpand(inc.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
                          >
                            {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className={cn(tdCls, 'font-bold text-brand')}>{inc.prefixo}</td>
                        <td className={tdCls}>{inc.obra}</td>
                        <td className={tdCls}>{fmtDate(inc.dataSinistro)}</td>
                        <td className={cn(tdCls, 'max-w-[220px]')}>
                          <span className="line-clamp-1 text-gray-600">{inc.descricao || '—'}</span>
                        </td>
                        <td className={tdCls}>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {inc.materiais.length} {inc.materiais.length === 1 ? 'item' : 'itens'}
                          </span>
                        </td>
                        <td className={cn(tdCls, 'font-semibold text-gray-900')}>
                          {totalSum > 0 ? fmtBRL(totalSum) : '—'}
                        </td>
                        <td className={tdCls}>
                          {inc.relatorioEnviado ? (
                            <span className={cn(
                              'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full',
                              inc.relatorioEnviado === 'Sim'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500',
                            )}>
                              {inc.relatorioEnviado === 'Sim' && <Check size={10} />}
                              {inc.relatorioEnviado}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={tdCls}>{fmtDate(inc.dataEnvioRelatorio)}</td>
                        <td className={tdCls}>
                          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', avcfg.bg, avcfg.text)}>
                            {avcfg.label}
                          </span>
                        </td>
                        <td className={tdCls}>{inc.valorAprovado !== null ? fmtBRL(inc.valorAprovado) : '—'}</td>
                        <td className={cn(tdCls, 'max-w-[200px]')}>
                          <span className="line-clamp-1 text-gray-500">{inc.observacao || '—'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(inc)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setConfirmDelete(inc.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded materials ── */}
                      {isExp && (
                        <tr className="border-b border-gray-100 bg-blue-50/20">
                          <td colSpan={13} className="px-4 pb-3 pt-1">
                            <table className="w-full border-collapse text-left rounded-xl overflow-hidden">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className={cn(thCls, 'min-w-[160px]')}>Material</th>
                                  <th className={cn(thCls, 'w-16')}>Qtd</th>
                                  <th className={cn(thCls, 'w-16')}>Fator</th>
                                  <th className={cn(thCls, 'w-28')}>Valor Unit.</th>
                                  <th className={cn(thCls, 'w-28')}>Subtotal</th>
                                  <th className={cn(thCls, 'w-24')}>% Bitrib.</th>
                                  <th className={cn(thCls, 'w-28')}>Total Gasto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inc.materiais.map((m) => {
                                  const sub   = calcSubtotal(m);
                                  const total = calcTotalGasto(sub, m.percentualBitributacao);
                                  return (
                                    <tr key={m.id} className="border-t border-gray-100">
                                      <td className={tdCls}>{m.material || '—'}</td>
                                      <td className={tdCls}>{m.qtd ?? '—'}</td>
                                      <td className={tdCls}>{m.fator ?? '—'}</td>
                                      <td className={tdCls}>{fmtBRL(m.valorUnitario)}</td>
                                      <td className={tdCls}>{fmtBRL(sub)}</td>
                                      <td className={tdCls}>{m.percentualBitributacao.toLocaleString('pt-BR')}%</td>
                                      <td className={cn(tdCls, 'font-semibold')}>{fmtBRL(total)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <p className="text-[14px] font-semibold text-gray-900 mb-2">Excluir avaria?</p>
            <p className="text-[13px] text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-[13px] text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-[13px] text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modalId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-900">
                {isNew ? 'Nova Avaria' : 'Editar Avaria'}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* ── Dados do incidente ── */}
              <section className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Dados do Incidente</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-500 font-medium">Prefixo *</label>
                    <select value={form.prefixo} onChange={(e) => setField('prefixo', e.target.value)}
                      className={inputCls}>
                      <option value="">Selecione</option>
                      {prefixos.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[11px] text-gray-500 font-medium">Obra *</label>
                    <select value={form.obra} onChange={(e) => setField('obra', e.target.value)}
                      className={inputCls}>
                      <option value="">Selecione</option>
                      {obras.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-500 font-medium">Data do Sinistro</label>
                    <input type="date" value={form.dataSinistro} onChange={(e) => setField('dataSinistro', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-500 font-medium">Descrição da Avaria</label>
                  <input type="text" value={form.descricao} onChange={(e) => setField('descricao', e.target.value)}
                    placeholder="Descreva brevemente o sinistro…"
                    className={cn(inputCls, 'h-9')} />
                </div>
              </section>

              {/* ── Materiais ── */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Materiais</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left" style={{ minWidth: 700 }}>
                    <thead>
                      <tr className="bg-gray-50 border border-gray-100 rounded-lg">
                        <th className={cn(thCls, 'min-w-[160px]')}>Material</th>
                        <th className={cn(thCls, 'w-20')}>Qtd</th>
                        <th className={cn(thCls, 'w-20')}>Fator</th>
                        <th className={cn(thCls, 'w-28')}>Valor Unit. (R$)</th>
                        <th className={cn(thCls, 'w-24')}>% Bitrib.</th>
                        <th className={cn(thCls, 'w-28 text-right')}>Subtotal</th>
                        <th className={cn(thCls, 'w-28 text-right')}>Total Gasto</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.materiais.map((m, idx) => {
                        const sub   = previewSubtotal(m);
                        const total = previewTotal(m);
                        return (
                          <tr key={m.id}>
                            <td className="px-1 py-1.5">
                              <input type="text" value={m.material} onChange={(e) => setMat(idx, { material: e.target.value })}
                                placeholder="Nome do material" className={inputCls} />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="number" min={0} value={m.qtd} onChange={(e) => setMat(idx, { qtd: e.target.value })}
                                placeholder="1" className={inputCls} />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="number" min={0} step="0.01" value={m.fator} onChange={(e) => setMat(idx, { fator: e.target.value })}
                                placeholder="1" className={inputCls} />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="number" min={0} step="0.01" value={m.valorUnitario} onChange={(e) => setMat(idx, { valorUnitario: e.target.value })}
                                placeholder="0,00" className={inputCls} />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="number" min={0} max={100} step="0.01" value={m.percentualBitributacao}
                                onChange={(e) => setMat(idx, { percentualBitributacao: e.target.value })}
                                className={inputCls} />
                            </td>
                            <td className="px-1 py-1.5 text-right">
                              <span className="text-[12px] font-medium text-gray-700">{fmtBRL(sub)}</span>
                            </td>
                            <td className="px-1 py-1.5 text-right">
                              <span className="text-[12px] font-semibold text-gray-900">{fmtBRL(total)}</span>
                            </td>
                            <td className="px-1 py-1.5">
                              {form.materiais.length > 1 && (
                                <button onClick={() => removeMat(idx)}
                                  className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                                  <X size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button onClick={addMat}
                  className="flex items-center gap-1.5 text-[12px] text-brand font-medium hover:underline">
                  <Plus size={13} /> Adicionar material
                </button>
              </section>

              {/* ── Relatório e Avaliação ── */}
              <section className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Relatório e Avaliação</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-500 font-medium">Relatório Enviado?</label>
                    <select value={form.relatorioEnviado} onChange={(e) => setField('relatorioEnviado', e.target.value as 'Sim' | 'Não' | '')}
                      className={inputCls}>
                      <option value="">—</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  {form.relatorioEnviado === 'Sim' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-500 font-medium">Data de Envio</label>
                      <input type="date" value={form.dataEnvioRelatorio} onChange={(e) => setField('dataEnvioRelatorio', e.target.value)}
                        className={inputCls} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[11px] text-gray-500 font-medium">Avaliação Cortez Engenharia</label>
                    <select value={form.avaliacaoCortez} onChange={(e) => setField('avaliacaoCortez', e.target.value as AvaliacaoCortezEngenharia)}
                      className={inputCls}>
                      <option value="">—</option>
                      {AVALIACAO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-gray-500 font-medium">Valor Aprovado (R$)</label>
                    <input type="number" min={0} step="0.01" value={form.valorAprovado}
                      onChange={(e) => setField('valorAprovado', e.target.value)}
                      placeholder="0,00" className={inputCls} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-500 font-medium">Observação</label>
                  <textarea
                    value={form.observacao}
                    onChange={(e) => setField('observacao', e.target.value)}
                    rows={2}
                    placeholder="Observações adicionais…"
                    className="px-3 py-2 text-[12px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none w-full"
                  />
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal}
                className="px-4 py-2 text-[13px] text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <Button variant="primary" onClick={handleSave} disabled={saving || !form.prefixo || !form.obra}>
                {saving ? 'Salvando…' : isNew ? 'Criar Avaria' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
