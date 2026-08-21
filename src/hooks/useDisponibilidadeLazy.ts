import { useCallback, useSyncExternalStore } from 'react';
import { disponibilidadeRepository } from '../services';
import { DisponibilidadeRecord } from '../types';
import { Collection } from './useCollection';
import { recordChange } from '../lib/lastChange';

/**
 * Assinatura sob demanda e paginada por período da coleção `disponibilidade`.
 *
 * A primeira tela que chamar `useDisponibilidadeLazy` dispara o `onSnapshot`
 * — filtrado por `[dataInicio, dataFim]`, não a coleção inteira — uma vez
 * só. Quem nunca abre a tela de Disponibilidade não paga nada. A partir daí
 * a assinatura vive em escopo de módulo, fora do ciclo de vida de qualquer
 * componente: trocar de aba e voltar, com o mesmo intervalo, não reassina.
 * Só quando o intervalo pedido MUDA (usuário troca de mês) é que a
 * assinatura anterior é encerrada e uma nova, para o novo intervalo, é
 * aberta — esse é o custo esperado da paginação, e é bem menor que o
 * full-scan que substitui.
 *
 * `disconnectDisponibilidade` encerra a assinatura; chamar só no logout
 * (ver `AppShell`), nunca em cleanup de tela.
 */

interface State {
  items: DisponibilidadeRecord[];
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
  unsubscribe = disponibilidadeRepository.subscribe!(
    (items) => setState({ items, loading: false, error: null }),
    (e) => setState({ error: e.message, loading: false }),
    { gte: dataInicio, lte: dataFim },
  );
}

export function disconnectDisponibilidade(): void {
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

export function useDisponibilidadeLazy(
  dataInicio: string,
  dataFim: string,
  userLabel?: string,
): Collection<DisponibilidadeRecord> {
  ensureSubscribed(dataInicio, dataFim);
  const snapshot = useSyncExternalStore(subscribeStore, getSnapshot);

  const create = useCallback(
    async (item: DisponibilidadeRecord) => {
      await disponibilidadeRepository.create(item);
      if (userLabel) recordChange(userLabel);
    },
    [userLabel],
  );

  const update = useCallback(
    async (id: string, item: DisponibilidadeRecord) => {
      await disponibilidadeRepository.update(id, item);
      if (userLabel) recordChange(userLabel);
    },
    [userLabel],
  );

  const remove = useCallback(
    async (id: string) => {
      await disponibilidadeRepository.remove(id);
      if (userLabel) recordChange(userLabel);
    },
    [userLabel],
  );

  const reload = useCallback(async () => {
    setState({ items: await disponibilidadeRepository.list() });
  }, []);

  return { items: snapshot.items, loading: snapshot.loading, error: snapshot.error, create, update, remove, reload };
}
