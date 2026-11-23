import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { COLLECTIONS, disponibilidadeRepository } from '../services';
import { DisponibilidadeRecord } from '../types';
import { contarSnapshot } from '../lib/readCounter';

/**
 * Leitura dedicada para o card "status de hoje" do Dashboard e da tela de
 * Mão de Obra — só o dia pedido, via `where('data', '==', data)`, em vez de
 * puxar a coleção `disponibilidade` inteira (que cresce 1 doc/equipamento/dia
 * sem limite). Sem Firebase configurado (modo local), filtra a lista do
 * `disponibilidadeRepository` — sem custo real, é só um array em memória.
 *
 * A assinatura é compartilhada e mantida viva durante a sessão (uma por data):
 * antes, cada vez que Dashboard ou Mão de Obra montava, um `onSnapshot` novo
 * era aberto (e fechado ao trocar de aba), relendo o dia. Agora as telas só
 * se penduram na assinatura existente. `desconectarDisponibilidadeHoje`
 * encerra tudo no logout (ver `AppShell`).
 */

interface Entrada {
  items: DisponibilidadeRecord[];
  recebeu: boolean;
  ouvintes: Set<(items: DisponibilidadeRecord[]) => void>;
  unsubscribe: () => void;
}

const entradas = new Map<string, Entrada>();

function assinar(dataISO: string, ouvinte: (items: DisponibilidadeRecord[]) => void): () => void {
  // Só uma data viva por vez: descarta as de outros dias que ninguém mais usa.
  entradas.forEach((e, data) => {
    if (data !== dataISO && e.ouvintes.size === 0) {
      e.unsubscribe();
      entradas.delete(data);
    }
  });

  let entrada = entradas.get(dataISO);
  if (!entrada) {
    const nova: Entrada = { items: [], recebeu: false, ouvintes: new Set(), unsubscribe: () => {} };
    const q = query(collection(db, COLLECTIONS.disponibilidade), where('data', '==', dataISO));
    nova.unsubscribe = onSnapshot(q, (snapshot) => {
      contarSnapshot('onSnapshot:disponibilidade (hoje)', snapshot);
      nova.items = snapshot.docs.map((d) => d.data() as DisponibilidadeRecord);
      nova.recebeu = true;
      nova.ouvintes.forEach((o) => o(nova.items));
    });
    entradas.set(dataISO, nova);
    entrada = nova;
  }

  entrada.ouvintes.add(ouvinte);
  if (entrada.recebeu) ouvinte(entrada.items);
  const viva = entrada;
  return () => {
    viva.ouvintes.delete(ouvinte);
  };
}

/** Encerra as assinaturas compartilhadas (logout). */
export function desconectarDisponibilidadeHoje(): void {
  entradas.forEach((e) => e.unsubscribe());
  entradas.clear();
}

export function useDisponibilidadeHoje(dataISO: string): DisponibilidadeRecord[] {
  const [items, setItems] = useState<DisponibilidadeRecord[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      let cancelled = false;
      disponibilidadeRepository.list().then((all) => {
        if (!cancelled) setItems(all.filter((r) => r.data === dataISO));
      });
      return () => {
        cancelled = true;
      };
    }

    return assinar(dataISO, setItems);
  }, [dataISO]);

  return items;
}
