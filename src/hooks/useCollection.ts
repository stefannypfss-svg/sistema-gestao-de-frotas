import { useCallback, useEffect, useState } from 'react';
import { Repository } from '../services/repository';

export interface Collection<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  create: (item: T) => Promise<void>;
  update: (id: string, item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Liga um `Repository` ao estado do React, expondo loading/error e operações
 * assíncronas. Toda view consome coleções por aqui, sem conhecer a origem dos
 * dados (localStorage hoje, API amanhã).
 */
export function useCollection<T>(repository: Repository<T>): Collection<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Tempo real disponível? Então o snapshot é a fonte de verdade do estado. */
  const isLive = typeof repository.subscribe === 'function';

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await repository.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    // Modo tempo real: a escuta mantém `items` sincronizado sozinha.
    if (repository.subscribe) {
      setLoading(true);
      const unsubscribe = repository.subscribe(
        (next) => {
          setItems(next);
          setError(null);
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      );
      return unsubscribe;
    }
    // Modo carregamento único.
    void reload();
  }, [repository, reload]);

  const create = useCallback(
    async (item: T) => {
      const saved = await repository.create(item);
      // No modo tempo real o snapshot atualiza o estado; evita item duplicado.
      if (!isLive) setItems((prev) => [...prev, saved]);
    },
    [repository, isLive],
  );

  const update = useCallback(
    async (id: string, item: T) => {
      const saved = await repository.update(id, item);
      if (!isLive) setItems((prev) => prev.map((i) => (matchesId(i, id) ? saved : i)));
    },
    [repository, isLive],
  );

  const remove = useCallback(
    async (id: string) => {
      await repository.remove(id);
      if (!isLive) setItems((prev) => prev.filter((i) => !matchesId(i, id)));
    },
    [repository, isLive],
  );

  return { items, loading, error, create, update, remove, reload };
}

/** Casa por `id` ou, para Equipment, por `prefixo`. */
function matchesId<T>(item: T, id: string): boolean {
  const record = item as Record<string, unknown>;
  return record.id === id || record.prefixo === id;
}
