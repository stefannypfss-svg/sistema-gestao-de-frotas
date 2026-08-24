/**
 * Backfill de eventos de manutenção — Requisito 11.
 *
 * Roda a mesma reconciliação (`reconciliarM`) sobre todo o histórico de `M`
 * já existente, por equipamento. Idempotente: na segunda passada, cada
 * bloco já tem exatamente 1 `evento_id` consistente, então vira no-op.
 *
 * Isolamento de falha por equipamento: um prefixo que falhar não derruba os
 * demais — o erro fica registrado no relatório e o backfill segue.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { COLLECTIONS, disponibilidadeRepository, eventoManutencaoRepository } from './index';
import { DisponibilidadeRecord, EventoManutencao } from '../types';
import { reconciliarM } from './manutencaoReconciliation';

async function lerEvento(id: string): Promise<EventoManutencao | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, COLLECTIONS.eventosManutencao, id));
  return snap.exists() ? (snap.data() as EventoManutencao) : null;
}

function addDiasStr(data: string, n: number): string {
  const d = new Date(data + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function temFronteira(
  data: string,
  porData: Map<string, DisponibilidadeRecord>,
  eventosPorId: Map<string, EventoManutencao>,
): boolean {
  const reg = porData.get(data);
  if (!reg?.eventoId) return false;
  const evento = eventosPorId.get(reg.eventoId);
  return !!evento?.separacaoManual && evento.dataInicio === data;
}

/** Agrupa todos os dias M de um equipamento (já carregados) em blocos contíguos. */
function agruparBlocos(
  todos: DisponibilidadeRecord[],
  eventosPorId: Map<string, EventoManutencao>,
): DisponibilidadeRecord[][] {
  const porData = new Map(todos.map((d) => [d.data, d]));
  const diasM = todos.filter((d) => d.status === 'M').sort((a, b) => a.data.localeCompare(b.data));
  const visitados = new Set<string>();
  const blocos: DisponibilidadeRecord[][] = [];

  for (const dia of diasM) {
    if (visitados.has(dia.data)) continue;
    const bloco: DisponibilidadeRecord[] = [dia];
    visitados.add(dia.data);

    let cursor = dia.data;
    while (true) {
      if (temFronteira(cursor, porData, eventosPorId)) break;
      const anterior = addDiasStr(cursor, -1);
      const reg = porData.get(anterior);
      if (reg && reg.status !== 'M') break;
      if (reg && reg.status === 'M') {
        bloco.unshift(reg);
        visitados.add(reg.data);
      } else if (!reg && anterior < todos[0].data) {
        break; // fora do que existe no banco
      }
      cursor = anterior;
    }

    cursor = dia.data;
    while (true) {
      const proximo = addDiasStr(cursor, 1);
      if (temFronteira(proximo, porData, eventosPorId)) break;
      const reg = porData.get(proximo);
      if (reg && reg.status !== 'M') break;
      if (reg && reg.status === 'M') {
        bloco.push(reg);
        visitados.add(reg.data);
      } else if (!reg && proximo > todos[todos.length - 1].data) {
        break;
      }
      cursor = proximo;
    }

    blocos.push(bloco);
  }

  return blocos;
}

export interface ResultadoBackfill {
  equipamentosProcessados: number;
  blocosCriados: number;
  blocosJaConsistentes: number;
  blocosTruncados: number;
  orfaosRemovidos: number;
  falhas: { prefixo: string; erro: string }[];
}

/**
 * Remove eventos de manutenção que nenhum dia mais referencia — a
 * reconciliação normal só anda no sentido dia → evento (garante que todo
 * dia aponte pro evento certo), então um evento que perdeu seu único dia
 * vinculado (ex.: o dia foi reatribuído a outro evento num teste, ou
 * editado fora do fluxo normal) fica pra trás, órfão, e nunca é limpo por
 * conta própria. Esta função varre no sentido inverso: evento → dias.
 */
async function removerOrfaos(
  prefixos: string[],
  falhas: { prefixo: string; erro: string }[],
): Promise<number> {
  const [todosEventos, todosDias] = await Promise.all([
    eventoManutencaoRepository.list(),
    disponibilidadeRepository.list(),
  ]);

  const referenciados = new Set(
    todosDias.filter((d) => d.status === 'M' && d.eventoId).map((d) => d.eventoId as string),
  );

  const prefixosSet = new Set(prefixos);
  const orfaos = todosEventos.filter((e) => prefixosSet.has(e.prefixo) && !referenciados.has(e.id));

  let removidos = 0;
  for (const evento of orfaos) {
    try {
      await eventoManutencaoRepository.remove(evento.id);
      removidos++;
    } catch (e) {
      falhas.push({
        prefixo: evento.prefixo,
        erro: `remover evento órfão ${evento.id} (${evento.dataInicio}–${evento.dataFim}): ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
  return removidos;
}

export async function executarBackfillManutencao(prefixos: string[]): Promise<ResultadoBackfill> {
  const resultado: ResultadoBackfill = {
    equipamentosProcessados: 0,
    blocosCriados: 0,
    blocosJaConsistentes: 0,
    blocosTruncados: 0,
    orfaosRemovidos: 0,
    falhas: [],
  };

  for (const prefixo of prefixos) {
    try {
      const todos = (await disponibilidadeRepository.list()).filter((r) => r.prefixo === prefixo);
      if (todos.length === 0) {
        resultado.equipamentosProcessados++;
        continue;
      }
      todos.sort((a, b) => a.data.localeCompare(b.data));

      const idsConhecidos = new Set(todos.map((r) => r.eventoId).filter((id): id is string => !!id));
      const eventosPorId = new Map<string, EventoManutencao>();
      for (const id of idsConhecidos) {
        const evento = await lerEvento(id);
        if (evento) eventosPorId.set(id, evento);
      }

      const blocos = agruparBlocos(todos, eventosPorId);

      for (const bloco of blocos) {
        const eventoIdsNoBloco = new Set(bloco.map((d) => d.eventoId).filter(Boolean));
        if (eventoIdsNoBloco.size === 1) {
          resultado.blocosJaConsistentes++;
          continue;
        }
        try {
          const diaAncora = bloco[Math.floor(bloco.length / 2)].data;
          const r = await reconciliarM({ prefixo, data: diaAncora });
          resultado.blocosCriados++;
          if (r.truncado) resultado.blocosTruncados++;
        } catch (e) {
          resultado.falhas.push({
            prefixo,
            erro: `bloco ${bloco[0].data}–${bloco[bloco.length - 1].data}: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }

      resultado.equipamentosProcessados++;
    } catch (e) {
      resultado.falhas.push({ prefixo, erro: e instanceof Error ? e.message : String(e) });
    }
  }

  // Roda por último — só depois que todos os blocos foram reconciliados é
  // que "não referenciado" reflete o estado final, não um intermediário.
  try {
    resultado.orfaosRemovidos = await removerOrfaos(prefixos, resultado.falhas);
  } catch (e) {
    resultado.falhas.push({ prefixo: '(órfãos)', erro: e instanceof Error ? e.message : String(e) });
  }

  return resultado;
}
