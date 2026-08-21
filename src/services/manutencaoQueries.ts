/**
 * Leituras de apoio à tela de Manutenção (somente leitura) — nunca escreve.
 */
import { addDays, format } from 'date-fns';
import { EventoManutencao } from '../types';
import { fetchIntervalo } from './index';

function addDiasStr(data: string, n: number): string {
  return format(addDays(new Date(data + 'T12:00:00'), n), 'yyyy-MM-dd');
}

/**
 * aberto = não existe, para o equipamento do evento, nenhum registro
 * posterior a `dataFim` com status ≠ M. Derivado na leitura (Requisito 9) —
 * nunca denormalizado, porque o que muda o estado é a passagem do tempo,
 * que não dispara escrita nenhuma.
 */
export async function verificarAberto(evento: EventoManutencao, hoje: string): Promise<boolean> {
  const depois = addDiasStr(evento.dataFim, 1);
  if (depois > hoje) return true; // dataFim já é hoje ou no futuro — nada pode vir depois
  const registrosDepois = await fetchIntervalo(evento.prefixo, depois, hoje);
  return !registrosDepois.some((r) => r.status !== 'M');
}

export function diasSemAtualizacao(evento: EventoManutencao, hoje: string): number {
  const t1 = new Date(evento.updatedAt).getTime();
  const t2 = new Date(hoje + 'T12:00:00').getTime();
  return Math.max(0, Math.round((t2 - t1) / 86400000));
}
