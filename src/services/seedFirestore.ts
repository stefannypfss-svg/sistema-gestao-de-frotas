import {
  collection,
  getDocs,
  writeBatch,
  doc,
  limit,
  query,
  Firestore,
} from 'firebase/firestore';
import { Allocation } from '../types';
import { INITIAL_EQUIPMENT, INITIAL_WORKS } from '../data/seed';
import { HOME_BASE } from '../config/theme';

/**
 * Alocações iniciais derivadas dos equipamentos locados fora da base.
 * (Movido de services/index.ts — pertence à lógica de semeadura.)
 */
function buildInitialAllocations(): Allocation[] {
  const startOfYear = new Date(2024, 0, 1).toISOString();
  return INITIAL_EQUIPMENT.filter(
    (eq) => eq.localizacaoAtual !== HOME_BASE && eq.status === 'Locado',
  ).map((eq, index) => {
    const work = INITIAL_WORKS.find((w) => w.nome === eq.localizacaoAtual);
    return {
      id: `initial-${index}`,
      prefixo: eq.prefixo,
      obraId: work?.id ?? '',
      obra: eq.localizacaoAtual,
      tipo: 'Atual',
      statusAlocacao: 'Confirmado',
      dataMobilizacao: startOfYear,
      dataDesmobilizacao: null,
      dataMobilizacaoReal: startOfYear,
      dataDesmobilizacaoReal: null,
      valorLocacao: eq.valorLocacao,
      observacoes: 'Alocação inicial automática',
    };
  });
}

/** Verdadeiro se a coleção não tem nenhum documento. */
async function isEmpty(db: Firestore, name: string): Promise<boolean> {
  const snapshot = await getDocs(query(collection(db, name), limit(1)));
  return snapshot.empty;
}

/** Grava uma lista numa coleção usando `getKey` como ID do documento. */
async function seedCollection<T>(
  db: Firestore,
  name: string,
  items: T[],
  getKey: (item: T) => string,
): Promise<void> {
  const batch = writeBatch(db);
  const ref = collection(db, name);
  items.forEach((item) => {
    batch.set(doc(ref, getKey(item)), item as Record<string, unknown>);
  });
  await batch.commit();
}

/**
 * Popula o Firestore na primeira execução. Idempotente: cada coleção só é
 * semeada se estiver vazia, então rodar de novo não duplica nada.
 */
export async function seedFirestore(
  db: Firestore,
  collections: { equipment: string; works: string; allocations: string },
): Promise<void> {
  if (await isEmpty(db, collections.equipment)) {
    await seedCollection(db, collections.equipment, INITIAL_EQUIPMENT, (e) => e.prefixo);
  }
  if (await isEmpty(db, collections.works)) {
    await seedCollection(db, collections.works, INITIAL_WORKS, (w) => w.id);
  }
  if (await isEmpty(db, collections.allocations)) {
    await seedCollection(db, collections.allocations, buildInitialAllocations(), (a) => a.id);
  }
}
