/**
 * Ponto único de composição da camada de dados.
 *
 * Se as credenciais do Firebase estiverem configuradas (ver `.env`), usa o
 * Cloud Firestore com tempo real e seed automático. Caso contrário, cai no
 * `LocalStorageRepository` — útil para desenvolvimento sem backend.
 *
 * Trocar de backend = trocar as instâncias abaixo. Nada mais no app muda.
 */
import { Equipment, Work, Allocation, EquipamentoObra, TabelaLocacao } from '../types';
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
  equipamentoObra: 'equipamento_obra',
  tabelaLocacao: 'tabela_locacao',
} as const;

/** Incrementar força o re-seed do localStorage de equipamentos. */
const LS_EQUIPMENT_VERSION = '4-clean-reseed';
const LS_VERSION_KEY = 'cortez_equipamentos_version';

if (localStorage.getItem(LS_VERSION_KEY) !== LS_EQUIPMENT_VERSION) {
  localStorage.removeItem('cortez_equipamentos');
  localStorage.setItem(LS_VERSION_KEY, LS_EQUIPMENT_VERSION);
}

/** Incrementar força o re-seed do localStorage de equipamento-por-obra. */
const LS_EQUIP_OBRA_VERSION = '2-location-names';
const LS_EQUIP_OBRA_VERSION_KEY = 'cortez_equip_obra_version';

if (localStorage.getItem(LS_EQUIP_OBRA_VERSION_KEY) !== LS_EQUIP_OBRA_VERSION) {
  localStorage.removeItem('cortez_equip_obra');
  localStorage.setItem(LS_EQUIP_OBRA_VERSION_KEY, LS_EQUIP_OBRA_VERSION);
}

const getEquipmentKey = (e: Equipment) => e.prefixo;
const getWorkKey = (w: Work) => w.id;
const getAllocationKey = (a: Allocation) => a.id;
const getEquipObraKey = (r: EquipamentoObra) => r.id;
const getTabelaLocacaoKey = (t: TabelaLocacao) => t.id;

let equipmentRepository: Repository<Equipment>;
let workRepository: Repository<Work>;
let allocationRepository: Repository<Allocation>;
let equipamentoObraRepository: Repository<EquipamentoObra>;
let tabelaLocacaoRepository: Repository<TabelaLocacao>;

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
  equipamentoObraRepository = new FirestoreRepository<EquipamentoObra>(
    db,
    COLLECTIONS.equipamentoObra,
    getEquipObraKey,
  );
  tabelaLocacaoRepository = new FirestoreRepository<TabelaLocacao>(
    db,
    COLLECTIONS.tabelaLocacao,
    getTabelaLocacaoKey,
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
  tabelaLocacaoRepository = new LocalStorageRepository<TabelaLocacao>(
    'cortez_tabela_locacao',
    getTabelaLocacaoKey,
    [],
  );
  equipamentoObraRepository = new LocalStorageRepository<EquipamentoObra>(
    'cortez_equip_obra',
    getEquipObraKey,
    INITIAL_EQUIPMENT.map((e) => {
      const LOCATION_TO_OBRA: Record<string, string> = {
        'EDI':           'Dom Inocêncio',
        'EDV':           'Esquina dos Ventos',
        'CER':           'Central de Equipamentos Rental',
        'ALI':           'Alliance',
        'NORTCOM':       'Nortcom',
        'SP-MANUTENÇÃO': 'Manutenção Terceirizada',
        'CTZ-ITA':       'Cortez - Itarema - CE',
      };
      return {
        id: e.prefixo,
        prefixo: e.prefixo,
        obra: LOCATION_TO_OBRA[e.localizacaoAtual] ?? e.localizacaoAtual,
        situacao: e.situacao,
      };
    }),
  );
}

export { equipmentRepository, workRepository, allocationRepository, equipamentoObraRepository, tabelaLocacaoRepository };
