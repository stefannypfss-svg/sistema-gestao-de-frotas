import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  CollectionReference,
  Firestore,
} from 'firebase/firestore';
import { Repository } from './repository';

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

  constructor(
    db: Firestore,
    private readonly collectionName: string,
    private readonly getKey: (item: T) => string,
  ) {
    this.ref = collection(db, collectionName);
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

  subscribe(
    onChange: (items: T[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    return onSnapshot(
      this.ref,
      (snapshot) => onChange(snapshot.docs.map((d) => d.data() as T)),
      (error) => onError?.(error),
    );
  }
}
