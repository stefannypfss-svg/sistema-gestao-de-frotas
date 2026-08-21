/**
 * Contrato de persistência assíncrono.
 *
 * As views e hooks dependem apenas desta interface, nunca da implementação
 * concreta. Trocar localStorage por uma API REST ou Supabase no futuro é só
 * fornecer outra classe que implemente `Repository` e apontar `services/index.ts`
 * para ela — sem tocar na camada de apresentação.
 */
/** Filtro de intervalo (`>=`/`<=`) sobre o campo de range configurado na implementação. */
export interface RangeFilter {
  gte?: string;
  lte?: string;
}

export interface Repository<T> {
  /** Retorna todos os registros. */
  list(): Promise<T[]>;
  /** Persiste um novo registro e o devolve (já com identificador). */
  create(item: T): Promise<T>;
  /** Atualiza o registro de `id` e devolve a versão salva. */
  update(id: string, item: T): Promise<T>;
  /** Remove o registro de `id`. */
  remove(id: string): Promise<void>;
  /**
   * Opcional: escuta mudanças ao vivo e chama `onChange` a cada atualização.
   * Retorna uma função para cancelar a escuta. Implementações sem suporte a
   * tempo real (ex: localStorage) simplesmente omitem este método — os
   * consumidores caem no modo `list()`.
   *
   * `range`: opcional, restringe a assinatura ao intervalo informado sobre o
   * campo de range da implementação (ver `FirestoreRepository`). Repositórios
   * que não declaram campo de range ignoram o argumento e assinam tudo, como
   * antes — nenhuma coleção existente muda de comportamento por causa disso.
   */
  subscribe?(
    onChange: (items: T[]) => void,
    onError?: (error: Error) => void,
    range?: RangeFilter,
  ): () => void;
}

/** Gera um identificador local único (substituído pelo banco quando houver). */
export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
