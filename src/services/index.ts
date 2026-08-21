/**
 * Ponto único de composição da camada de dados.
 *
 * Se as credenciais do Firebase estiverem configuradas (ver `.env`), usa o
 * Cloud Firestore com tempo real e seed automático. Caso contrário, cai no
 * `LocalStorageRepository` — útil para desenvolvimento sem backend.
 *
 * Trocar de backend = trocar as instâncias abaixo. Nada mais no app muda.
 */
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Equipment, Work, Allocation, EquipamentoObra, TabelaLocacao, DisponibilidadeRecord, AvariaIncidente, EventoManutencao } from '../types';
import { Repository } from './repository';
import { LocalStorageRepository } from './localStorageRepository';
import { FirestoreRepository } from './firestoreRepository';
import { db, isFirebaseConfigured } from './firebase';
import { seedFirestore } from './seedFirestore';
import { INITIAL_EQUIPMENT, INITIAL_WORKS } from '../data/seed';

export const COLLECTIONS = {
  equipment: 'equipamentos',
  works: 'obras',
  allocations: 'alocacoes',
  equipamentoObra: 'equipamento_obra',
  tabelaLocacao: 'tabela_locacao',
  disponibilidade: 'disponibilidade',
  avarias: 'avarias',
  eventosManutencao: 'eventos_manutencao',
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
const getDisponibilidadeKey = (r: DisponibilidadeRecord) => r.id;
const getAvariaKey = (a: AvariaIncidente) => a.id;
const getEventoManutencaoKey = (e: EventoManutencao) => e.id;

let equipmentRepository: Repository<Equipment>;
let workRepository: Repository<Work>;
let allocationRepository: Repository<Allocation>;
let equipamentoObraRepository: Repository<EquipamentoObra>;
let tabelaLocacaoRepository: Repository<TabelaLocacao>;
let disponibilidadeRepository: Repository<DisponibilidadeRecord>;
let avariaRepository: Repository<AvariaIncidente>;
let eventoManutencaoRepository: Repository<EventoManutencao>;

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
  // `disponibilidade` cresce 1 doc/equipamento/dia. `rangeField: 'data'`
  // permite que quem assina (useDisponibilidadeLazy) peça só um intervalo —
  // hoje, o mês em tela — em vez da coleção inteira. Acompanhar em Firebase
  // Console → Usage; o full-scan residual (ex.: fetchIntervalo/fetchUltimo-
  // RegistroAntes abaixo, que ignoram esse filtro de propósito) ainda cresce
  // com o histórico, mas fica limitado ao que cada função realmente precisa.
  disponibilidadeRepository = new FirestoreRepository<DisponibilidadeRecord>(
    db,
    COLLECTIONS.disponibilidade,
    getDisponibilidadeKey,
    'data',
  );
  avariaRepository = new FirestoreRepository<AvariaIncidente>(
    db,
    COLLECTIONS.avarias,
    getAvariaKey,
  );
  // Coleção nova: já nasce com query filtrada por período (rangeField:
  // 'dataInicio') — não herda o padrão de assinatura global de
  // `disponibilidade`.
  eventoManutencaoRepository = new FirestoreRepository<EventoManutencao>(
    db,
    COLLECTIONS.eventosManutencao,
    getEventoManutencaoKey,
    'dataInicio',
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
  disponibilidadeRepository = new LocalStorageRepository<DisponibilidadeRecord>(
    'cortez_disponibilidade',
    getDisponibilidadeKey,
    [],
  );
  avariaRepository = new LocalStorageRepository<AvariaIncidente>(
    'cortez_avarias',
    getAvariaKey,
    [],
  );
  eventoManutencaoRepository = new LocalStorageRepository<EventoManutencao>(
    'cortez_eventos_manutencao',
    getEventoManutencaoKey,
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

export { equipmentRepository, workRepository, allocationRepository, equipamentoObraRepository, tabelaLocacaoRepository, disponibilidadeRepository, avariaRepository, eventoManutencaoRepository };

/**
 * Leitura pontual (não-live) de `disponibilidade` por equipamento e
 * intervalo de datas. Ignora de propósito o range da assinatura paginada —
 * um piso ali viraria um teto silencioso no tamanho máximo de um evento de
 * manutenção. Uso previsto: a futura reconciliação dia → evento, pra olhar
 * vizinhos (D-1/D+1) fora do mês carregado em tela.
 *
 * Exige um índice composto (`prefixo` ASC + `data` DESC) — declarado em
 * `firestore.indexes.json`. Se a query falhar (índice ausente/propagando),
 * loga com `console.error` e relança — quem chama decide como sinalizar na
 * UI; nunca engolimos o erro aqui, porque uma falha silenciosa nesta função
 * é uma falha silenciosa no preenchimento automático.
 */
export async function fetchIntervalo(
  prefixo: string,
  dataInicio: string,
  dataFim: string,
): Promise<DisponibilidadeRecord[]> {
  if (!isFirebaseConfigured) {
    const all = await disponibilidadeRepository.list();
    return all.filter((r) => r.prefixo === prefixo && r.data >= dataInicio && r.data <= dataFim);
  }
  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.disponibilidade),
        where('prefixo', '==', prefixo),
        where('data', '>=', dataInicio),
        where('data', '<=', dataFim),
      ),
    );
    return snapshot.docs.map((d) => d.data() as DisponibilidadeRecord);
  } catch (e) {
    console.error(
      `[fetchIntervalo] falha ao ler disponibilidade de ${prefixo} entre ${dataInicio} e ${dataFim} — ` +
        'provável índice composto (prefixo+data) ausente no Firestore. Ver firestore.indexes.json.',
      e,
    );
    throw e;
  }
}

/**
 * Último `status_dia` registrado de um equipamento antes de `antesDe`
 * (exclusivo), ou `null` se não houver nenhum. Leitura pontual, 1 documento,
 * independente do range da assinatura paginada — usada como fallback do
 * auto-copy (ver `fetchUltimosRegistros`) quando um equipamento fica em
 * silêncio por mais tempo do que a janela em lote cobre.
 *
 * Mesma exigência de índice composto e mesma política de erro de
 * `fetchIntervalo`: nunca falha em silêncio, sempre loga e relança.
 */
export async function fetchUltimoRegistroAntes(
  prefixo: string,
  antesDe: string,
): Promise<DisponibilidadeRecord | null> {
  if (!isFirebaseConfigured) {
    const all = await disponibilidadeRepository.list();
    const anteriores = all
      .filter((r) => r.prefixo === prefixo && r.data < antesDe)
      .sort((a, b) => b.data.localeCompare(a.data));
    return anteriores[0] ?? null;
  }
  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.disponibilidade),
        where('prefixo', '==', prefixo),
        where('data', '<', antesDe),
        orderBy('data', 'desc'),
        limit(1),
      ),
    );
    return snapshot.empty ? null : (snapshot.docs[0].data() as DisponibilidadeRecord);
  } catch (e) {
    console.error(
      `[fetchUltimoRegistroAntes] falha ao ler o último registro de ${prefixo} antes de ${antesDe} — ` +
        'provável índice composto (prefixo+data) ausente no Firestore. Ver firestore.indexes.json.',
      e,
    );
    throw e;
  }
}

/**
 * Busca, numa única query, o registro mais recente de cada equipamento
 * dentro de `[desde, antesDe)`, e reduz para 1 registro por prefixo em
 * memória. Query de campo único (`data`), sem exigir índice composto.
 *
 * Substitui N leituras individuais (uma por equipamento, via
 * `fetchUltimoRegistroAntes`) por 1 — ao custo de eventualmente ler mais
 * documentos do que o estritamente necessário, quando um equipamento muda
 * de status várias vezes dentro da janela. Ainda assim limitado pela
 * janela, nunca pela coleção inteira. Equipamentos sem nenhum registro na
 * janela (silêncio mais longo que `desde`) não aparecem no mapa — quem
 * chama decide se cai pra `fetchUltimoRegistroAntes` individual nesses
 * casos, que devem ser raros.
 */
export async function fetchUltimosRegistros(
  desde: string,
  antesDe: string,
): Promise<Map<string, DisponibilidadeRecord>> {
  const porPrefixo = new Map<string, DisponibilidadeRecord>();
  const registrar = (r: DisponibilidadeRecord) => {
    const atual = porPrefixo.get(r.prefixo);
    if (!atual || r.data > atual.data) porPrefixo.set(r.prefixo, r);
  };

  if (!isFirebaseConfigured) {
    const all = await disponibilidadeRepository.list();
    all.filter((r) => r.data >= desde && r.data < antesDe).forEach(registrar);
    return porPrefixo;
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.disponibilidade),
        where('data', '>=', desde),
        where('data', '<', antesDe),
      ),
    );
    snapshot.docs.forEach((d) => registrar(d.data() as DisponibilidadeRecord));
    return porPrefixo;
  } catch (e) {
    console.error(`[fetchUltimosRegistros] falha ao ler disponibilidade entre ${desde} e ${antesDe}.`, e);
    throw e;
  }
}
