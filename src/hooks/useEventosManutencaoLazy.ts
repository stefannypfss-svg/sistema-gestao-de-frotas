import { useCallback, useSyncExternalStore } from 'react';
import { eventoManutencaoRepository } from '../services';
import { EventoManutencao } from '../types';
import { Collection } from './useCollection';

/**
 * Assinatura sob demanda e paginada por período de `eventos_manutencao` —
 * mesmo padrão de `useDisponibilidadeLazy`, mas para a coleção nova, que já
 * nasce filtrada por período (Requisito 12): não herda o padrão de
 * assinatura global de `disponibilidade`.
 */

interface State {
  items: EventoManutencao[];
  loading: boolean;
  error: string | null;
}

let state: State = { items: [], loading: true, error: null };
let currentRangeKey: string | null = null;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function setState(partial: Partial<State>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

function ensureSubscribed(dataInicio: string, dataFim: string) {
  const key = `${dataInicio}|${dataFim}`;
  if (currentRangeKey === key && unsubscribe) return;

  unsubscribe?.();
  currentRangeKey = key;
  state = { items: [], loading: true, error: null };
  unsubscribe = eventoManutencaoRepository.subscribe!(
    (items) => setState({ items, loading: false, error: null }),
    (e) => setState({ error: e.message, loading: false }),
    { gte: dataInicio, lte: dataFim },
  );
}

export function disconnectEventosManutencao(): void {
  unsubscribe?.();
  unsubscribe = null;
  currentRangeKey = null;
  state = { items: [], loading: true, error: null };
}

function subscribeStore(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useEventosManutencaoLazy(dataInicio: string, dataFim: string): Collection<EventoManutencao> {
  ensureSubscribed(dataInicio, dataFim);
  const snapshot = useSyncExternalStore(subscribeStore, getSnapshot);

  const create = useCallback(async (item: EventoManutencao) => {
    await eventoManutencaoRepository.create(item);
  }, []);
  const update = useCallback(async (id: string, item: EventoManutencao) => {
    await eventoManutencaoRepository.update(id, item);
  }, []);
  const remove = useCallback(async (id: string) => {
    await eventoManutencaoRepository.remove(id);
  }, []);
  const reload = useCallback(async () => {
    setState({ items: await eventoManutencaoRepository.list() });
  }, []);

  return { items: snapshot.items, loading: snapshot.loading, error: snapshot.error, create, update, remove, reload };
}
