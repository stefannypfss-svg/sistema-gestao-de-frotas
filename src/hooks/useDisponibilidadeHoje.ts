import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { COLLECTIONS, disponibilidadeRepository } from '../services';
import { DisponibilidadeRecord } from '../types';

/**
 * Leitura dedicada para o card "status de hoje" do Dashboard — só o dia
 * pedido, via `where('data', '==', data)`, em vez de puxar a coleção
 * `disponibilidade` inteira (que cresce 1 doc/equipamento/dia sem limite).
 * Sem Firebase configurado (modo local), filtra a lista do
 * `disponibilidadeRepository` — sem custo real, é só um array em memória.
 */
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

    const q = query(collection(db, COLLECTIONS.disponibilidade), where('data', '==', dataISO));
    return onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((d) => d.data() as DisponibilidadeRecord));
    });
  }, [dataISO]);

  return items;
}
