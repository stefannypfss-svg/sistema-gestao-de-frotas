import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { disponibilidadeRepository } from '../services';
import { DisponibilidadeRecord } from '../types';
import { Collection } from './useCollection';
import { recordChange } from '../lib/lastChange';
import { Janela, janelaCobre, recortarPorData, uniaoJanelas } from '../lib/janelaDisponibilidade';

/**
 * Assinatura sob demanda e paginada por período da coleção `disponibilidade`.
 *
 * A primeira tela que chamar `useDisponibilidadeLazy` dispara o `onSnapshot`
 * — filtrado por período, não a coleção inteira — uma vez só. A assinatura
 * vive em escopo de módulo, fora do ciclo de vida de qualquer componente.
 *
 * Janela só-crescente: cada tela pede um intervalo diferente (Previsão =
 * início do 1º período → hoje; Disponibilidade = mês(es) em tela; Análise =
 * ano). Antes, cada troca de intervalo cancelava e recriava a assinatura,
 * relendo os documentos a cada troca de aba. Agora a assinatura cobre a
 * UNIÃO dos intervalos já pedidos na sessão e só é refeita quando uma tela
 * pede algo fora da janela atual (ela alarga, nunca encolhe). Cada tela
 * recebe apenas o recorte `[dataInicio, dataFim]` que pediu — o mesmo
 * conjunto que a query antiga devolvia — e enquanto a janela ainda não
 * cobre o pedido ela vê `items: []` + `loading: true`, como antes.
 *
 * `disconnectDisponibilidade` encerra a assinatura; chamar só no logout
 * (ver `AppShell`), nunca em cleanup de tela.
 */

interface State {
  /** Documentos crus da assinatura — cobrem `carregada`, nada além. */
  items: DisponibilidadeRecord[];
  loading: boolean;
  error: string | null;
  /** Janela que `items` já cobre (null enquanto o 1º snapshot não chegou). */
  carregada: Janela | null;
}

const ESTADO_VAZIO: State = { items: [], loading: true, error: null, carregada: null };

const EMPTY: DisponibilidadeRecord[] = [];

let state: State = ESTADO_VAZIO;
let janelaAssinada: Janela | null = null;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

function setState(partial: Partial<State>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

function ensureSubscribed(pedida: Janela) {
  if (unsubscribe && janelaAssinada && janelaCobre(janelaAssinada, pedida)) return;

  const alvo = janelaAssinada ? uniaoJanelas(janelaAssinada, pedida) : pedida;
  unsubscribe?.();
  janelaAssinada = alvo;
  state = ESTADO_VAZIO;
  unsubscribe = disponibilidadeRepository.subscribe!(
    (items) => setState({ items, loading: false, error: null, carregada: alvo }),
    (e) => setState({ error: e.message, loading: false }),
    { gte: alvo.ini, lte: alvo.fim },
  );
}

export function disconnectDisponibilidade(): void {
  unsubscribe?.();
  unsubscribe = null;
  janelaAssinada = null;
  state = ESTADO_VAZIO;
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
  ensureSubscribed({ ini: dataInicio, fim: dataFim });
  const snapshot = useSyncExternalStore(subscribeStore, getSnapshot);

  const { items: rawItems, carregada } = snapshot;
  const cobertura = carregada !== null && janelaCobre(carregada, { ini: dataInicio, fim: dataFim });
  const items = useMemo(
    () => (cobertura ? recortarPorData(rawItems, { ini: dataInicio, fim: dataFim }) : EMPTY),
    [cobertura, rawItems, dataInicio, dataFim],
  );
  // Janela ainda não cobre o pedido (alargando): comporta-se como antes de uma
  // troca de intervalo — sem itens e carregando.
  const loading = cobertura ? snapshot.loading : snapshot.error ? false : true;

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
    // Coleção inteira: cobre qualquer recorte pedido, até o próximo snapshot.
    setState({
      items: await disponibilidadeRepository.list(),
      carregada: { ini: '0000-01-01', fim: '9999-12-31' },
    });
  }, []);

  return { items, loading, error: snapshot.error, create, update, remove, reload };
}
