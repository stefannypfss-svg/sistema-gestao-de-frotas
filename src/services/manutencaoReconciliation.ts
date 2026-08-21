/**
 * Reconciliação dia → evento de manutenção.
 *
 * Toda operação (criar, estender, mesclar, encolher, deletar) passa por
 * aqui. A escrita nunca acontece à mão fora deste módulo — a Disponibilidade
 * chama estas funções, a tela de Manutenção só lê o resultado.
 *
 * Desenho em duas fases, por limitação do SDK Web do Firestore:
 * `Transaction.get()` só aceita `DocumentReference`, não `Query` (isso é
 * verdade em toda versão do SDK Web — Admin SDK e mobile suportam query em
 * transação, Web não). Então:
 *
 *  1. Planejamento (fora da transação): `fetchIntervalo`, leitura simples,
 *     decide o bloco contíguo e o estado final.
 *  2. Confirmação (`runTransaction`): relê cada documento específico já
 *     identificado por `transaction.get(docRef)` — ponto a ponto, não por
 *     query — e escreve tudo junto.
 *
 * Garantia: atomicidade da escrita (nunca sobra estado parcial — dia
 * apontando pra evento com datas desatualizadas é impossível). O que fica
 * como consistência eventual: a fronteira do bloco decidida no
 * planejamento pode estar um dia defasada se alguém editar o mesmo bloco
 * bem entre o planejamento e o commit — erro pequeno e visível, corrigido
 * sozinho na próxima reconciliação daquele bloco (ela sempre recalcula a
 * partir do estado atual). Se a concorrência aumentar a ponto de isso
 * importar, o caminho é mover a reconciliação para uma Cloud Function com
 * Admin SDK, onde query em transação existe.
 */
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { addDays, format } from 'date-fns';
import { db, isFirebaseConfigured } from './firebase';
import { COLLECTIONS, disponibilidadeRepository, eventoManutencaoRepository, fetchIntervalo } from './index';
import { DisponibilidadeRecord, DisponibilidadeStatus, EventoManutencao, TipoManutencao, SistemaManutencao } from '../types';

/** Janela inicial do scan de bloco — escopo de leitura, não de tempo esperado do evento. */
const BASE_WINDOW_DAYS = 45;
/** Teto de expansão — além disso, trunca e sinaliza em vez de continuar lendo. */
const MAX_WINDOW_DAYS = 730;
/** Teto de mutações por reconciliação (margem sob o limite de 500 do Firestore). */
const MAX_DIAS_BLOCO = 490;

function addDiasStr(data: string, n: number): string {
  return format(addDays(new Date(data + 'T12:00:00'), n), 'yyyy-MM-dd');
}

function diffDias(a: string, b: string): number {
  const ta = new Date(a + 'T12:00:00').getTime();
  const tb = new Date(b + 'T12:00:00').getTime();
  return Math.round((tb - ta) / 86400000);
}

function gerarIdEvento(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Firestore rejeita `undefined` explícito num campo — só aceita a chave
 * ausente ou `null`. Campos opcionais (horaInicio/horaFim) viram `undefined`
 * naturalmente ao espalhar objetos parciais; isso limpa antes de qualquer
 * `set`/`update`. */
function semUndefined<T extends object>(obj: T): T {
  const out = {} as T;
  (Object.keys(obj) as (keyof T)[]).forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}

export class ErroDecisaoNecessaria extends Error {
  constructor(public decisao: 'merge_conflito' | 'fronteira_pertencimento') {
    super(`Decisão necessária antes de reconciliar: ${decisao}`);
  }
}

/* ── Leitura de documentos específicos (fora de transação) ─────────────── */

async function lerDia(prefixo: string, data: string): Promise<DisponibilidadeRecord | null> {
  const id = `${prefixo}||${data}`;
  if (!isFirebaseConfigured) {
    const all = await disponibilidadeRepository.list();
    return all.find((r) => r.id === id) ?? null;
  }
  const snap = await getDoc(doc(db, COLLECTIONS.disponibilidade, id));
  return snap.exists() ? (snap.data() as DisponibilidadeRecord) : null;
}

async function lerEvento(id: string): Promise<EventoManutencao | null> {
  if (!isFirebaseConfigured) {
    const all = await eventoManutencaoRepository.list();
    return all.find((e) => e.id === id) ?? null;
  }
  const snap = await getDoc(doc(db, COLLECTIONS.eventosManutencao, id));
  return snap.exists() ? (snap.data() as EventoManutencao) : null;
}

/* ── Bloco contíguo — núcleo puro, opera sobre dados já lidos ───────────── */

interface BlocoResolvido {
  dias: DisponibilidadeRecord[]; // ordenados por data asc, só dias M reais
  eventoIds: string[]; // distintos, ordem de descoberta
  bateuNoLimiteInicio: boolean; // saiu por atingir a borda da janela lida, não por achar quebra real
  bateuNoLimiteFim: boolean;
}

function temFronteiraDeclaradaEm(
  data: string,
  registrosPorData: Map<string, DisponibilidadeRecord>,
  eventosPorId: Map<string, EventoManutencao>,
): boolean {
  const reg = registrosPorData.get(data);
  if (!reg?.eventoId) return false;
  const evento = eventosPorId.get(reg.eventoId);
  return !!evento?.separacaoManual && evento.dataInicio === data;
}

function hojeStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function resolverBloco(
  data: string,
  registrosPorData: Map<string, DisponibilidadeRecord>,
  eventosPorId: Map<string, EventoManutencao>,
  janelaMin: string,
  janelaMax: string,
): BlocoResolvido {
  const central = registrosPorData.get(data);
  const dias: DisponibilidadeRecord[] = central && central.status === 'M' ? [central] : [];
  const eventoIds: string[] = [];
  const addEvento = (id?: string) => {
    if (id && !eventoIds.includes(id)) eventoIds.push(id);
  };
  addEvento(central?.eventoId);

  // Backward: pára antes de cruzar uma fronteira declarada na posição atual.
  let bateuNoLimiteInicio = false;
  let cursor = data;
  while (true) {
    if (temFronteiraDeclaradaEm(cursor, registrosPorData, eventosPorId)) break;
    const anterior = addDiasStr(cursor, -1);
    if (anterior < janelaMin) {
      bateuNoLimiteInicio = true;
      break;
    }
    const reg = registrosPorData.get(anterior);
    if (reg && reg.status !== 'M') break;
    if (reg && reg.status === 'M') {
      dias.unshift(reg);
      addEvento(reg.eventoId);
    }
    // reg undefined = vazio (herdado/legado) — atravessa sem adicionar ao bloco
    cursor = anterior;
  }

  // Forward: pára antes de entrar num dia que é início declarado de outro evento.
  // "Hoje" é uma borda real, não um limite de janela — dias futuros nunca têm
  // registro (nada aconteceu ainda), então tratá-los como vazio-a-atravessar
  // faria o scan bater no teto de expansão (730 dias) toda vez que alguém
  // mexe num dia de hoje em diante.
  const hoje = hojeStr();
  let bateuNoLimiteFim = false;
  cursor = data;
  while (true) {
    const proximo = addDiasStr(cursor, 1);
    if (proximo > hoje) break;
    if (proximo > janelaMax) {
      bateuNoLimiteFim = true;
      break;
    }
    if (temFronteiraDeclaradaEm(proximo, registrosPorData, eventosPorId)) break;
    const reg = registrosPorData.get(proximo);
    if (reg && reg.status !== 'M') break;
    if (reg && reg.status === 'M') {
      dias.push(reg);
      addEvento(reg.eventoId);
    }
    cursor = proximo;
  }

  return { dias, eventoIds, bateuNoLimiteInicio, bateuNoLimiteFim };
}

async function buscarRange(prefixo: string, gte: string, lte: string): Promise<DisponibilidadeRecord[]> {
  return fetchIntervalo(prefixo, gte, lte);
}

/** Fase de planejamento: janela generosa, dobra só se tocar a borda, teto duro. */
async function expandirEBuscarBloco(
  prefixo: string,
  data: string,
): Promise<{ bloco: BlocoResolvido; eventos: Map<string, EventoManutencao> }> {
  let janela = BASE_WINDOW_DAYS;
  const eventosPorId = new Map<string, EventoManutencao>();
  let bloco: BlocoResolvido;

  const hoje = hojeStr();
  while (true) {
    const janelaMin = addDiasStr(data, -janela);
    const janelaMax = addDiasStr(data, janela) > hoje ? hoje : addDiasStr(data, janela);
    const registros = await buscarRange(prefixo, janelaMin, janelaMax);
    const registrosPorData = new Map(registros.map((r) => [r.data, r]));

    const idsConhecidos = new Set(registros.map((r) => r.eventoId).filter((id): id is string => !!id));
    for (const id of idsConhecidos) {
      if (!eventosPorId.has(id)) {
        const evento = await lerEvento(id);
        if (evento) eventosPorId.set(id, evento);
      }
    }

    bloco = resolverBloco(data, registrosPorData, eventosPorId, janelaMin, janelaMax);

    const podeExpandir = janela < MAX_WINDOW_DAYS;
    if ((bloco.bateuNoLimiteInicio || bloco.bateuNoLimiteFim) && podeExpandir) {
      janela = Math.min(janela * 2, MAX_WINDOW_DAYS);
      continue;
    }
    break;
  }

  for (const id of bloco.eventoIds) {
    if (!eventosPorId.has(id)) {
      const evento = await lerEvento(id);
      if (evento) eventosPorId.set(id, evento);
    }
  }

  return { bloco, eventos: eventosPorId };
}

/* ── Agregados do evento — sempre derivados dos dias vinculados ─────────── */

function calcularAgregados(dias: DisponibilidadeRecord[]): {
  dataInicio: string;
  dataFim: string;
  diasParados: number;
  horasParadas: number;
  horasParciais: boolean;
} {
  const ordenados = [...dias].sort((a, b) => a.data.localeCompare(b.data));
  const dataInicio = ordenados[0].data;
  const dataFim = ordenados[ordenados.length - 1].data;
  const diasParados = diffDias(dataInicio, dataFim) + 1;

  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  let horasParadas = 0;
  let horasParciais = true;
  if (primeiro.horaInicio && ultimo.horaFim) {
    const ini = new Date(`${dataInicio}T${primeiro.horaInicio}:00`).getTime();
    const fim = new Date(`${dataFim}T${ultimo.horaFim}:00`).getTime();
    horasParadas = Math.max(0, (fim - ini) / 3600000);
    horasParciais = false;
  }

  return { dataInicio, dataFim, diasParados, horasParadas, horasParciais };
}

/* ── Preview (não-transacional) — alimenta os diálogos do popover ───────── */

export type VinculoPreview =
  | { tipo: 'novo'; ultimaClassificacao: { tipo: TipoManutencao | null; sistema: SistemaManutencao | null } | null }
  | { tipo: 'continuacao'; evento: EventoManutencao }
  | { tipo: 'merge_silencioso' }
  | { tipo: 'merge_conflito'; sobrevivente: EventoManutencao; absorvido: EventoManutencao }
  | { tipo: 'fronteira_pertencimento'; eventos: EventoManutencao[] };

export async function buscarUltimaClassificacao(
  prefixo: string,
): Promise<{ tipo: TipoManutencao | null; sistema: SistemaManutencao | null } | null> {
  const eventos = (await eventoManutencaoRepository.list()).filter((e) => e.prefixo === prefixo);
  const comClassificacao = eventos
    .filter((e) => e.tipo || e.sistema)
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  if (comClassificacao.length === 0) return null;
  return { tipo: comClassificacao[0].tipo, sistema: comClassificacao[0].sistema };
}

export async function previewVinculoM(prefixo: string, data: string): Promise<VinculoPreview> {
  const { bloco, eventos } = await expandirEBuscarBloco(prefixo, data);

  if (bloco.eventoIds.length === 0) {
    return { tipo: 'novo', ultimaClassificacao: await buscarUltimaClassificacao(prefixo) };
  }
  if (bloco.eventoIds.length === 1) {
    return { tipo: 'continuacao', evento: eventos.get(bloco.eventoIds[0])! };
  }

  const encontrados = bloco.eventoIds.map((id) => eventos.get(id)).filter((e): e is EventoManutencao => !!e);
  const algumSeparado = encontrados.some((e) => e.separacaoManual);
  if (algumSeparado) {
    return { tipo: 'fronteira_pertencimento', eventos: encontrados };
  }

  encontrados.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  const [sobrevivente, ...absorvidos] = encontrados;
  const divergem = absorvidos.some(
    (e) =>
      (e.tipo && sobrevivente.tipo && e.tipo !== sobrevivente.tipo) ||
      (e.sistema && sobrevivente.sistema && e.sistema !== sobrevivente.sistema),
  );
  if (divergem) {
    return { tipo: 'merge_conflito', sobrevivente, absorvido: absorvidos[0] };
  }
  return { tipo: 'merge_silencioso' };
}

export async function eventoSeriaDeletado(prefixo: string, data: string): Promise<boolean> {
  const dia = await lerDia(prefixo, data);
  if (dia?.status !== 'M' || !dia.eventoId) return false;
  const evento = await lerEvento(dia.eventoId);
  return !!evento && evento.dataInicio === data && evento.dataFim === data;
}

/* ── Reconciliação (transacional) ────────────────────────────────────────── */

export interface ReconciliarMInput {
  prefixo: string;
  data: string;
  horaInicio?: string;
  /** Usada quando o preview indicou 'novo', ou quando `forcarNovaOcorrencia` é true. */
  novaClassificacao?: { tipo: TipoManutencao | null; sistema: SistemaManutencao | null; nota: string | null };
  /** Usuário respondeu "Não, nova ocorrência" no diálogo de continuação. */
  forcarNovaOcorrencia?: boolean;
  /** Necessária só quando o preview indicou 'merge_conflito'. true = mantém a do sobrevivente. */
  manterClassificacaoDoSobrevivente?: boolean;
  /** Necessária só quando o preview indicou 'fronteira_pertencimento'. */
  pertenceAoEventoId?: string;
}

export async function reconciliarM(input: ReconciliarMInput): Promise<{ eventoId: string; truncado: boolean }> {
  const { prefixo, data } = input;
  const agora = new Date().toISOString();

  const { bloco, eventos } = await expandirEBuscarBloco(prefixo, data);

  let diasBloco = bloco.dias;
  if (!diasBloco.some((d) => d.data === data)) {
    diasBloco = [...diasBloco, { id: `${prefixo}||${data}`, prefixo, data, status: 'M' as const, horaInicio: input.horaInicio }].sort(
      (a, b) => a.data.localeCompare(b.data),
    );
  } else if (input.horaInicio) {
    diasBloco = diasBloco.map((d) => (d.data === data ? { ...d, horaInicio: input.horaInicio } : d));
  }

  const truncadoPorJanela = bloco.bateuNoLimiteInicio || bloco.bateuNoLimiteFim;
  let diasFinal = diasBloco;
  let truncadoPorMutacao = false;
  if (diasFinal.length > MAX_DIAS_BLOCO) {
    diasFinal = diasFinal.slice(diasFinal.length - MAX_DIAS_BLOCO); // mantém os mais recentes
    truncadoPorMutacao = true;
  }
  const truncado = truncadoPorJanela || truncadoPorMutacao;

  const eventoIds = bloco.eventoIds;
  let eventoFinal: EventoManutencao;
  const eventosParaApagar: string[] = [];

  if (eventoIds.length === 0 || input.forcarNovaOcorrencia) {
    const classificacao = input.novaClassificacao ?? { tipo: null, sistema: null, nota: null };
    eventoFinal = {
      id: gerarIdEvento(prefixo),
      prefixo,
      ...calcularAgregados(diasFinal),
      tipo: classificacao.tipo,
      sistema: classificacao.sistema,
      nota: classificacao.nota,
      separacaoManual: !!input.forcarNovaOcorrencia,
      truncado,
      createdAt: agora,
      updatedAt: agora,
    };
  } else if (eventoIds.length === 1) {
    const existente = eventos.get(eventoIds[0])!;
    eventoFinal = { ...existente, ...calcularAgregados(diasFinal), truncado, updatedAt: agora };
  } else {
    const encontrados = eventoIds.map((id) => eventos.get(id)).filter((e): e is EventoManutencao => !!e);
    const algumSeparado = encontrados.some((e) => e.separacaoManual);

    if (algumSeparado) {
      if (!input.pertenceAoEventoId) throw new ErroDecisaoNecessaria('fronteira_pertencimento');
      const escolhido = encontrados.find((e) => e.id === input.pertenceAoEventoId);
      if (!escolhido) throw new Error('Evento escolhido não está no bloco encontrado.');
      const diasDoEscolhido = diasFinal.filter((d) => d.eventoId === escolhido.id || d.data === data);
      eventoFinal = { ...escolhido, ...calcularAgregados(diasDoEscolhido), truncado, updatedAt: agora };
      diasFinal = diasDoEscolhido;
    } else {
      encontrados.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
      const [maisAntigo, ...absorvidos] = encontrados;
      eventosParaApagar.push(...absorvidos.map((e) => e.id));

      const divergem = absorvidos.some(
        (e) =>
          (e.tipo && maisAntigo.tipo && e.tipo !== maisAntigo.tipo) ||
          (e.sistema && maisAntigo.sistema && e.sistema !== maisAntigo.sistema),
      );
      if (divergem && input.manterClassificacaoDoSobrevivente === undefined) {
        throw new ErroDecisaoNecessaria('merge_conflito');
      }

      const usarSobrevivente = input.manterClassificacaoDoSobrevivente !== false;
      const fonte = usarSobrevivente ? maisAntigo : absorvidos.find((e) => e.tipo || e.sistema) ?? absorvidos[0];
      const nota = [maisAntigo.nota, ...absorvidos.map((e) => e.nota)].filter(Boolean).join(' · ') || null;

      eventoFinal = {
        ...maisAntigo,
        ...calcularAgregados(diasFinal),
        tipo: fonte.tipo ?? maisAntigo.tipo,
        sistema: fonte.sistema ?? maisAntigo.sistema,
        nota,
        truncado,
        updatedAt: agora,
      };
    }
  }

  await runTransaction(db, async (tx) => {
    const diasFrescos: DisponibilidadeRecord[] = [];
    for (const dia of diasFinal) {
      const ref = doc(db, COLLECTIONS.disponibilidade, dia.id);
      const snap = await tx.get(ref);
      const fresco = snap.exists() ? (snap.data() as DisponibilidadeRecord) : dia;
      diasFrescos.push(dia.data === data && input.horaInicio ? { ...fresco, horaInicio: input.horaInicio } : fresco);
    }

    const agregadosFrescos = calcularAgregados(diasFrescos);
    const eventoParaGravar: EventoManutencao = { ...eventoFinal, ...agregadosFrescos };

    tx.set(doc(db, COLLECTIONS.eventosManutencao, eventoParaGravar.id), eventoParaGravar);
    for (const id of eventosParaApagar) tx.delete(doc(db, COLLECTIONS.eventosManutencao, id));
    for (const dia of diasFrescos) {
      tx.set(doc(db, COLLECTIONS.disponibilidade, dia.id), semUndefined({ ...dia, status: 'M' as const, eventoId: eventoParaGravar.id }));
    }
  });

  return { eventoId: eventoFinal.id, truncado };
}

/* ── Requisito 6 — Limpar / trocar status: desvincula do evento ─────────── */

export async function definirStatusNaoM(
  prefixo: string,
  data: string,
  novoStatus: DisponibilidadeStatus | null,
): Promise<void> {
  const diaAtual = await lerDia(prefixo, data);
  const eventoIdAtual = diaAtual?.status === 'M' ? diaAtual.eventoId : undefined;
  const id = `${prefixo}||${data}`;

  if (!eventoIdAtual) {
    if (novoStatus === null) {
      await disponibilidadeRepository.remove(id);
    } else {
      await disponibilidadeRepository.update(id, { id, prefixo, data, status: novoStatus });
    }
    return;
  }

  const evento = await lerEvento(eventoIdAtual);
  let eventoAtualizado: EventoManutencao | null = null;
  if (evento) {
    const diasDoEvento = await fetchIntervalo(prefixo, evento.dataInicio, evento.dataFim);
    const restantes = diasDoEvento.filter((d) => d.data !== data && d.status === 'M' && d.eventoId === eventoIdAtual);
    eventoAtualizado = restantes.length === 0 ? null : { ...evento, ...calcularAgregados(restantes), updatedAt: new Date().toISOString() };
  }

  await runTransaction(db, async (tx) => {
    const diaRef = doc(db, COLLECTIONS.disponibilidade, id);
    if (novoStatus === null) {
      tx.delete(diaRef);
    } else {
      tx.set(diaRef, { id, prefixo, data, status: novoStatus });
    }

    if (evento) {
      const eventoRef = doc(db, COLLECTIONS.eventosManutencao, eventoIdAtual);
      if (eventoAtualizado) {
        tx.set(eventoRef, eventoAtualizado);
      } else {
        tx.delete(eventoRef);
      }
    }
  });
}

/* ── Requisito 2 — horário: create-or-update + agregados do evento ──────── */

export async function salvarHorarioDia(
  prefixo: string,
  data: string,
  horaInicio: string | undefined,
  horaFim: string | undefined,
): Promise<{ eventoId: string | null; ehFimDoEvento: boolean }> {
  const dia = await lerDia(prefixo, data);
  const eventoId = dia?.eventoId;
  const id = `${prefixo}||${data}`;

  if (!eventoId) {
    await disponibilidadeRepository.update(id, semUndefined({ id, prefixo, data, status: 'M' as const, horaInicio, horaFim }));
    return { eventoId: null, ehFimDoEvento: false };
  }

  const evento = await lerEvento(eventoId);
  if (!evento) throw new Error('Evento não encontrado para este dia.');

  const diasDoEvento = await fetchIntervalo(prefixo, evento.dataInicio, evento.dataFim);
  const diasAtualizados = diasDoEvento
    .filter((d) => d.eventoId === eventoId || d.data === data)
    .map((d) => (d.data === data ? { ...d, horaInicio: horaInicio ?? d.horaInicio, horaFim: horaFim ?? d.horaFim } : d));
  const agregados = calcularAgregados(diasAtualizados);

  await runTransaction(db, async (tx) => {
    const diaRef = doc(db, COLLECTIONS.disponibilidade, id);
    const snap = await tx.get(diaRef);
    const fresco = snap.exists()
      ? (snap.data() as DisponibilidadeRecord)
      : { id, prefixo, data, status: 'M' as const, eventoId };
    const diaFinal: DisponibilidadeRecord = {
      ...fresco,
      status: 'M',
      eventoId,
      horaInicio: horaInicio ?? fresco.horaInicio,
      horaFim: horaFim ?? fresco.horaFim,
    };

    tx.set(diaRef, semUndefined(diaFinal));
    tx.set(doc(db, COLLECTIONS.eventosManutencao, eventoId), { ...evento, ...agregados, updatedAt: new Date().toISOString() });
  });

  return { eventoId, ehFimDoEvento: data === evento.dataFim };
}

export async function liberarApartirDeAmanha(prefixo: string, data: string): Promise<void> {
  const amanha = addDiasStr(data, 1);
  await definirStatusNaoM(prefixo, amanha, 'EO');
}
