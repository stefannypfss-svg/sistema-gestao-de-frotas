import React, { useEffect, useState } from 'react';
import { Drawer, StateMessage } from '../../components/ui';
import { eventoManutencaoRepository } from '../../services';
import { EventoManutencao } from '../../types';

interface Props {
  prefixo: string;
  descricao: string;
  onClose: () => void;
}

function formatarData(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function rotuloEvento(e: EventoManutencao): string {
  const partes = [e.tipo, e.sistema].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Não classificado';
}

/**
 * Histórico de manutenção de um equipamento, aberto ao clicar no
 * identificador/descrição dele na Disponibilidade — é ali que a dúvida
 * nasce ("por que esse está parado tanto?"). Somente leitura.
 */
export function EquipmentHistoryDrawer({ prefixo, descricao, onClose }: Props) {
  const [eventos, setEventos] = useState<EventoManutencao[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const todos = await eventoManutencaoRepository.list();
      if (!cancelado) {
        setEventos(todos.filter((e) => e.prefixo === prefixo).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)));
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [prefixo]);

  return (
    <Drawer title={prefixo} subtitle={descricao} onClose={onClose}>
      {eventos === null ? (
        <StateMessage>Carregando…</StateMessage>
      ) : eventos.length === 0 ? (
        <StateMessage>Nenhuma manutenção registrada para este equipamento.</StateMessage>
      ) : (
        <div className="space-y-3">
          {eventos.map((e) => (
            <div key={e.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-[12px] text-gray-800 font-medium">
                {formatarData(e.dataInicio)}–{formatarData(e.dataFim)} · {e.diasParados} dias ·{' '}
                {e.horasParciais ? `${Math.round(e.horasParadas)}h+` : `${Math.round(e.horasParadas)}h paradas`}
                {e.truncado && <span className="text-amber-600"> · truncado</span>}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">{rotuloEvento(e)}</p>
              {e.nota && <p className="text-[11px] text-gray-400 mt-0.5">"{e.nota}"</p>}
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
