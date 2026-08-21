import React from 'react';
import { Clock } from 'lucide-react';
import { EventoManutencao, TipoManutencao, SistemaManutencao } from '../../types';
import { cn } from '../../lib/utils';

export type MFlowState =
  | { fase: 'carregando' }
  | { fase: 'novo' }
  | { fase: 'continuacao'; evento: EventoManutencao }
  | { fase: 'continuacao_nova'; evento: EventoManutencao }
  | { fase: 'merge_conflito'; sobrevivente: EventoManutencao; absorvido: EventoManutencao }
  | { fase: 'fronteira'; eventos: EventoManutencao[] }
  | { fase: 'erro'; mensagem: string }
  | null;

const TIPOS: TipoManutencao[] = ['Corretiva', 'Preventiva', 'Revisão', 'Sinistro'];
const SISTEMAS: SistemaManutencao[] = ['Motor', 'Hidráulico', 'Elétrico', 'Rodante', 'Estrutura', 'Outro'];

function resumoEvento(e: EventoManutencao): string {
  const partes = [e.tipo, e.sistema].filter(Boolean);
  const rotulo = partes.length > 0 ? partes.join(' · ') : 'Não classificado';
  return e.nota ? `${rotulo} · "${e.nota}"` : rotulo;
}

function ChipRow<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: T[];
  valor: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {opcoes.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(valor === op ? null : op)}
          className={cn(
            'px-2 py-1 rounded-md text-[10px] font-medium border transition-colors',
            valor === op
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-gray-600 border-gray-200 hover:border-brand/50',
          )}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

interface Props {
  flow: MFlowState;
  formTipo: TipoManutencao | null;
  formSistema: SistemaManutencao | null;
  formNota: string;
  setFormTipo: (v: TipoManutencao | null) => void;
  setFormSistema: (v: SistemaManutencao | null) => void;
  setFormNota: (v: string) => void;
  timeDraft: { horaInicio: string; horaFim: string };
  setTimeDraft: (updater: (t: { horaInicio: string; horaFim: string }) => { horaInicio: string; horaFim: string }) => void;
  onConfirmarNovo: () => void;
  onConfirmarContinuacao: () => void;
  onRecusarContinuacao: () => void;
  onConfirmarNovaOcorrencia: () => void;
  onConfirmarMerge: (manterSobrevivente: boolean) => void;
  onConfirmarFronteira: (eventoId: string) => void;
}

export function MaintenancePopoverFlow({
  flow,
  formTipo,
  formSistema,
  formNota,
  setFormTipo,
  setFormSistema,
  setFormNota,
  timeDraft,
  setTimeDraft,
  onConfirmarNovo,
  onConfirmarContinuacao,
  onRecusarContinuacao,
  onConfirmarNovaOcorrencia,
  onConfirmarMerge,
  onConfirmarFronteira,
}: Props) {
  if (!flow) return null;

  if (flow.fase === 'carregando') {
    return <div className="mt-1.5 pt-1.5 border-t border-gray-100 px-1 text-[11px] text-gray-400">Verificando…</div>;
  }

  if (flow.fase === 'erro') {
    return (
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 px-1 text-[11px] text-red-600">
        Não foi possível confirmar: {flow.mensagem}
      </div>
    );
  }

  if (flow.fase === 'continuacao') {
    return (
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 px-1 min-w-[220px]">
        <p className="text-[11px] text-gray-600 mb-1">Continuação da manutenção de {formatarData(flow.evento.dataInicio)}?</p>
        <p className="text-[10px] text-gray-400 mb-2 line-clamp-2">{resumoEvento(flow.evento)}</p>
        <div className="flex gap-1.5">
          <button
            autoFocus
            onClick={onConfirmarContinuacao}
            className="flex-1 h-7 text-[11px] font-medium text-white bg-brand rounded-md hover:opacity-90"
          >
            Sim, continuação
          </button>
          <button
            onClick={onRecusarContinuacao}
            className="flex-1 h-7 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Não, nova
          </button>
        </div>
      </div>
    );
  }

  if (flow.fase === 'merge_conflito') {
    return (
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 px-1 min-w-[220px]">
        <p className="text-[11px] text-gray-600 mb-2">Estes dois períodos viraram um só. Qual classificação manter?</p>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onConfirmarMerge(true)}
            className="text-left px-2 py-1.5 rounded-md text-[11px] bg-gray-50 hover:bg-gray-100"
          >
            {resumoEvento(flow.sobrevivente)}
          </button>
          <button
            onClick={() => onConfirmarMerge(false)}
            className="text-left px-2 py-1.5 rounded-md text-[11px] bg-gray-50 hover:bg-gray-100"
          >
            {resumoEvento(flow.absorvido)}
          </button>
        </div>
      </div>
    );
  }

  if (flow.fase === 'fronteira') {
    return (
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 px-1 min-w-[220px]">
        <p className="text-[11px] text-gray-600 mb-2">A qual manutenção este dia pertence?</p>
        <div className="flex flex-col gap-1">
          {flow.eventos.map((ev) => (
            <button
              key={ev.id}
              onClick={() => onConfirmarFronteira(ev.id)}
              className="text-left px-2 py-1.5 rounded-md text-[11px] bg-gray-50 hover:bg-gray-100"
            >
              {formatarData(ev.dataInicio)}–{formatarData(ev.dataFim)} · {resumoEvento(ev)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 'novo' | 'continuacao_nova' — formulário de classificação
  const confirmar = flow.fase === 'novo' ? onConfirmarNovo : onConfirmarNovaOcorrencia;
  return (
    <div className="mt-1.5 pt-1.5 border-t border-gray-100 px-1 min-w-[220px]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <input
          type="time"
          placeholder="início"
          value={timeDraft.horaInicio}
          onChange={(e) => setTimeDraft((t) => ({ ...t, horaInicio: e.target.value }))}
          className="w-full h-7 px-1.5 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:border-brand"
        />
      </div>
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Tipo</span>
      <ChipRow opcoes={TIPOS} valor={formTipo} onChange={setFormTipo} />
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mt-1.5 mb-1">Sistema</span>
      <ChipRow opcoes={SISTEMAS} valor={formSistema} onChange={setFormSistema} />
      <input
        type="text"
        placeholder="Nota (opcional)"
        value={formNota}
        onChange={(e) => setFormNota(e.target.value)}
        className="w-full h-7 mt-1.5 px-2 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:border-brand"
      />
      <button
        onClick={confirmar}
        className="w-full mt-1.5 h-7 flex items-center justify-center gap-1 text-[11px] font-medium text-white bg-brand rounded-md hover:opacity-90"
      >
        <Clock size={11} /> Salvar
      </button>
    </div>
  );
}

function formatarData(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
