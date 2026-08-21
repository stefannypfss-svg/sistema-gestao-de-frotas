import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  CollectionReference,
  Query,
  Firestore,
} from 'firebase/firestore';
import { Repository, RangeFilter } from './repository';

/**
 * Implementação de `Repository` sobre o Cloud Firestore.
 *
 * Usa a chave de domínio (`prefixo` para Equipment, `id` para os demais) como
 * ID do documento, preservando os identificadores já existentes. Os métodos
 * espelham a assinatura assíncrona do contrato, então as views não percebem a
 * troca de localStorage para Firestore.
 */
export class FirestoreRepository<T> implements Repository<T> {
  private readonly ref: CollectionReference;

  /**
   * `rangeField`: opcional — nome do campo usado quando `subscribe` recebe
   * um `range`. Sem ele (caso de toda coleção exceto `disponibilidade`),
   * `subscribe` ignora qualquer `range` passado e assina tudo, como sempre.
   */
  constructor(
    db: Firestore,
    private readonly collectionName: string,
    private readonly getKey: (item: T) => string,
    private readonly rangeField?: string,
  ) {
    this.ref = collection(db, collectionName);
  }

  private withRange(range?: RangeFilter): CollectionReference | Query {
    if (!range || !this.rangeField) return this.ref;
    const constraints = [];
    if (range.gte !== undefined) constraints.push(where(this.rangeField, '>=', range.gte));
    if (range.lte !== undefined) constraints.push(where(this.rangeField, '<=', range.lte));
    return constraints.length > 0 ? query(this.ref, ...constraints) : this.ref;
  }

  async list(): Promise<T[]> {
    const snapshot = await getDocs(this.ref);
    return snapshot.docs.map((d) => d.data() as T);
  }

  async create(item: T): Promise<T> {
    await setDoc(doc(this.ref, this.getKey(item)), item as Record<string, unknown>);
    return item;
  }

  async update(id: string, item: T): Promise<T> {
    await setDoc(doc(this.ref, id), item as Record<string, unknown>);
    return item;
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(this.ref, id));
  }

  /**
   * Assina a coleção inteira, sem `where`/`limit` — decisão intencional, não
   * omissão. Cada nova sessão (login/F5) paga o custo de 1 leitura por
   * documento existente; o custo cresce com o histórico acumulado, não com o
   * uso. Aceitável hoje (poucos milhares de docs); virar `query()` filtrada
   * é um projeto à parte, não um ajuste pontual — ver nota em
   * `services/index.ts` sobre `disponibilidadeRepository`.
   */
  subscribe(
    onChange: (items: T[]) => void,
    onError?: (error: Error) => void,
    range?: RangeFilter,
  ): () => void {
    return onSnapshot(
      this.withRange(range),
      (snapshot) => onChange(snapshot.docs.map((d) => d.data() as T)),
      (error) => onError?.(error),
    );
  }
}
