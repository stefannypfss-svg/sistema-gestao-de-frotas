/**
 * Leitura compartilhada da coleção INTEIRA `eventos_manutencao`.
 *
 * Antes, Previsão, Disponibilidade, Análise e a gaveta de histórico faziam
 * `eventoManutencaoRepository.list()` (getDocs — sempre vai ao servidor,
 * ignora o cache) a cada vez que a tela montava. Agora há UMA assinatura
 * por sessão (que usa o cache local persistente: depois da 1ª carga só chega
 * o delta), e cada tela pega uma "foto" dela ao montar.
 *
 * Para manter o comportamento de antes, a foto só é entregue depois que o
 * servidor confirmou o snapshot (não dados velhos do cache) — igual ao
 * `list()` — e cada chamador congela o resultado (não há atualização ao vivo
 * dentro de uma tela já aberta). Sem Firebase configurado, delega ao
 * `list()` do repositório local, como antes.
 *
 * Esta assinatura é SEM filtro de data, de propósito: a de `useEventosManutencaoLazy`
 * filtra por `dataInicio` e não enxerga eventos antigos ainda abertos.
 */
import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { COLLECTIONS, eventoManutencaoRepository } from './index';
import { EventoManutencao } from '../types';
import { contarSnapshot } from '../lib/readCounter';

/** Se o servidor não confirmar nesse prazo (ex.: offline), entrega o que o cache tem. */
const ESPERA_MAX_MS = 5000;

let eventos: EventoManutencao[] = [];
let confirmado = false;
let falhou = false;
let unsubscribe: (() => void) | null = null;
let esperando: Array<() => void> = [];

function liberar() {
  const fila = esperando;
  esperando = [];
  fila.forEach((f) => f());
}

function garantirAssinatura() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    collection(db, COLLECTIONS.eventosManutencao),
    { includeMetadataChanges: true },
    (snapshot) => {
      contarSnapshot('onSnapshot:eventos_manutencao (compartilhado)', snapshot);
      // Novo array a cada snapshot — nunca muda um array já entregue a alguém.
      eventos = snapshot.docs.map((d) => d.data() as EventoManutencao);
      if (!snapshot.metadata.fromCache) {
        confirmado = true;
        liberar();
      }
    },
    (e) => {
      console.error('[eventosManutencao] falha na assinatura compartilhada — voltando a ler com list():', e);
      falhou = true;
      unsubscribe = null;
      liberar();
    },
  );
}

/** Todos os eventos de manutenção (foto do momento da chamada). */
export async function obterTodosEventosManutencao(): Promise<EventoManutencao[]> {
  if (!isFirebaseConfigured || falhou) return eventoManutencaoRepository.list();
  garantirAssinatura();
  if (!confirmado) {
    await new Promise<void>((resolve) => {
      esperando.push(resolve);
      setTimeout(resolve, ESPERA_MAX_MS);
    });
    if (falhou) return eventoManutencaoRepository.list();
  }
  return eventos;
}

/** Encerra a assinatura (logout). */
export function desconectarEventosManutencaoCompartilhados(): void {
  unsubscribe?.();
  unsubscribe = null;
  eventos = [];
  confirmado = false;
  falhou = false;
  liberar();
}
