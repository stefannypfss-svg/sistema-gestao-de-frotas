/**
 * Ponto único de composição da camada de dados.
 *
 * Se as credenciais do Firebase estiverem configuradas (ver `.env`), usa o
 * Cloud Firestore com tempo real e seed automático. Caso contrário, cai no
 * `LocalStorageRepository` — útil para desenvolvimento sem backend.
 *
 * Trocar de backend = trocar as instâncias abaixo. Nada mais no app muda.
 */
import { Equipment, Work, Allocation } from '../types';
import { Repository } from './repository';
import { LocalStorageRepository } from './localStorageRepository';
import { FirestoreRepository } from './firestoreRepository';
import { db, isFirebaseConfigured } from './firebase';
import { seedFirestore } from './seedFirestore';
import { INITIAL_EQUIPMENT, INITIAL_WORKS } from '../data/seed';

const COLLECTIONS = {
  equipment: 'equipamentos',
  works: 'obras',
  allocations: 'alocacoes',
} as const;

const getEquipmentKey = (e: Equipment) => e.prefixo;
const getWorkKey = (w: Work) => w.id;
const getAllocationKey = (a: Allocation) => a.id;

let equipmentRepository: Repository<Equipment>;
let workRepository: Repository<Work>;
let allocationRepository: Repository<Allocation>;

if (isFirebaseConfigured) {
  equipmentRepository = new FirestoreRepository<Equipment>(
    db,
    COLLECTIONS.equipment,
    getEquipmentKey,
  );
  workRepository = new FirestoreRepository<Work>(db, COLLECTIONS.works, getWorkKey);
  allocationRepository = new FirestoreRepository<Allocation>(
    db,
    COLLECTIONS.allocations,
    getAllocationKey,
  );

  // Semeia uma única vez (idempotente). Não bloqueia a renderização.
  void seedFirestore(db, COLLECTIONS).catch((e) =>
    console.error('Falha ao semear o Firestore:', e),
  );
} else {
  // Fallback local: localStorage com seed embutido.
  console.warn(
    '[services] Firebase não configurado — usando localStorage. ' +
      'Preencha o .env com as credenciais do Firebase para ativar o Firestore.',
  );
  equipmentRepository = new LocalStorageRepository<Equipment>(
    'cortez_equipamentos',
    getEquipmentKey,
    INITIAL_EQUIPMENT,
  );
  workRepository = new LocalStorageRepository<Work>(
    'cortez_obras',
    getWorkKey,
    INITIAL_WORKS,
  );
  allocationRepository = new LocalStorageRepository<Allocation>(
    'cortez_alocacoes',
    getAllocationKey,
    [],
  );
}

export { equipmentRepository, workRepository, allocationRepository };
