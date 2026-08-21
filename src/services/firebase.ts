/**
 * Inicialização do Firebase / Cloud Firestore.
 *
 * As credenciais vêm de variáveis de ambiente Vite (prefixo VITE_). Crie um
 * projeto em https://console.firebase.google.com, ative o Cloud Firestore e
 * copie os valores de `firebaseConfig` para o seu arquivo `.env` (veja
 * `.env.example`). O `.env` está no .gitignore — não comite credenciais.
 */
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Indica se as credenciais foram configuradas (decide o backend ativo). */
export const isFirebaseConfigured = Boolean(firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);

/**
 * Cache local persistente (IndexedDB): a cada F5/nova sessão, o `onSnapshot`
 * reidrata do disco e busca só o delta desde a última sincronização, em vez
 * de refazer o full-scan da coleção. `persistentMultipleTabManager` é
 * obrigatório — sem ele a persistência falha silenciosamente quando o app
 * fica aberto em mais de uma aba.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth = getAuth(app);
