import {
  collection,
  getDocs,
  writeBatch,
  doc,
  limit,
  query,
  getDoc,
  setDoc,
  Firestore,
} from 'firebase/firestore';
import { Allocation } from '../types';
import { INITIAL_EQUIPMENT, INITIAL_WORKS } from '../data/seed';
import { HOME_BASE } from '../config/theme';

/** Incrementar este valor força o re-seed de equipamentos no próximo startup. */
const EQUIPMENT_SEED_VERSION = '4-clean-reseed';

/**
 * Alocações iniciais derivadas dos equipamentos locados fora da base.
 * (Movido de services/index.ts — pertence à lógica de semeadura.)
 */
function buildInitialAllocations(): Allocation[] {
  const startOfYear = new Date(2024, 0, 1).toISOString();
  return INITIAL_EQUIPMENT.filter(
    (eq) => eq.localizacaoAtual !== HOME_BASE && eq.situacao === 'Mobilizado',
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

/** Apaga todos os documentos de uma coleção (batch, máx 500 por vez). */
async function clearCollection(db: Firestore, name: string): Promise<void> {
  const snapshot = await getDocs(collection(db, name));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
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
 * Retorna a versão atual do seed de equipamentos gravada no Firestore.
 * Retorna null se ainda não foi gravada.
 */
async function getEquipmentSeedVersion(db: Firestore): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, '_meta', 'seedVersion'));
    if (!snap.exists()) return null;
    return (snap.data()?.equipment as string) ?? null;
  } catch {
    return null;
  }
}

async function setEquipmentSeedVersion(db: Firestore, version: string): Promise<void> {
  await setDoc(doc(db, '_meta', 'seedVersion'), { equipment: version }, { merge: true });
}

/**
 * Popula o Firestore na primeira execução e força re-seed de equipamentos
 * quando a versão do seed muda (novos campos adicionados).
 */
export async function seedFirestore(
  db: Firestore,
  collections: { equipment: string; works: string; allocations: string },
): Promise<void> {
  const storedVersion = await getEquipmentSeedVersion(db);
  const needsEquipmentSeed = storedVersion !== EQUIPMENT_SEED_VERSION;

  if (needsEquipmentSeed) {
    await clearCollection(db, collections.equipment);
    await seedCollection(db, collections.equipment, INITIAL_EQUIPMENT, (e) => e.prefixo);
    await setEquipmentSeedVersion(db, EQUIPMENT_SEED_VERSION);
  }
  if (await isEmpty(db, collections.works)) {
    await seedCollection(db, collections.works, INITIAL_WORKS, (w) => w.id);
  }
  if (await isEmpty(db, collections.allocations)) {
    await seedCollection(db, collections.allocations, buildInitialAllocations(), (a) => a.id);
  }
}
