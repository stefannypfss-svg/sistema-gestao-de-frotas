import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase';

/**
 * "Última alteração" — compartilhada entre usuários via um único documento
 * no Firestore (`_meta/lastChange`), não mais só `localStorage`. Um doc
 * único, sobrescrito a cada chamada: 1 leitura no snapshot inicial, e mais
 * 1 a cada alteração de qualquer pessoa — o padrão de leitura mais barato
 * que existe no Firestore, nada a ver com o crescimento de `disponibilidade`.
 *
 * Sem Firebase configurado (modo local), cai para `localStorage` + evento de
 * janela — como antes, mas nesse modo não há "outros usuários" mesmo.
 */
const KEY = 'fleet:lastChange';

export interface LastChange {
  timestamp: string;
  userName: string;
}

export function getLastChange(): LastChange | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastChange) : null;
  } catch {
    return null;
  }
}

export function recordChange(userName: string): void {
  const entry: LastChange = { timestamp: new Date().toISOString(), userName };
  localStorage.setItem(KEY, JSON.stringify(entry));
  window.dispatchEvent(new Event('fleet:lastChange'));

  if (isFirebaseConfigured) {
    setDoc(doc(db, '_meta', 'lastChange'), entry).catch((e) => {
      console.error('[lastChange] falha ao sincronizar com o Firestore:', e);
    });
  }
}

/** Assina mudanças — Firestore (compartilhado) quando configurado, senão o evento local. */
export function subscribeLastChange(onChange: (value: LastChange | null) => void): () => void {
  if (!isFirebaseConfigured) {
    const handler = () => onChange(getLastChange());
    window.addEventListener('fleet:lastChange', handler);
    return () => window.removeEventListener('fleet:lastChange', handler);
  }

  return onSnapshot(
    doc(db, '_meta', 'lastChange'),
    (snap) => onChange(snap.exists() ? (snap.data() as LastChange) : null),
    (e) => console.error('[lastChange] falha ao assinar o Firestore:', e),
  );
}
