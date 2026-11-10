/**
 * Contador de leituras do Firestore — SÓ EM DESENVOLVIMENTO (import.meta.env.DEV).
 * Em produção, `contarLeituras` é no-op. Serve para medir quais pontos do app
 * consomem a cota (Spark: 50 mil leituras/dia). Não altera nenhuma leitura.
 *
 * Uso no console do navegador:
 *   __leituras()        → tabela com total por ponto de leitura
 *   __leituras.reset()  → zera os contadores
 *
 * Contagem: aproximação da cobrança do Firestore — 1 por documento vindo do
 * servidor (snapshot inicial = todos os docs; depois, só os alterados). Docs
 * servidos pelo cache local não entram.
 */
const totais = new Map<string, { docs: number; chamadas: number }>();

export function contarLeituras(rotulo: string, docs: number): void {
  if (!import.meta.env.DEV) return;
  const atual = totais.get(rotulo) ?? { docs: 0, chamadas: 0 };
  atual.docs += docs;
  atual.chamadas += 1;
  totais.set(rotulo, atual);
}

/** Conta docs de um snapshot de `onSnapshot`, ignorando o que veio do cache. */
export function contarSnapshot(
  rotulo: string,
  snapshot: { metadata: { fromCache: boolean }; docChanges: () => unknown[] },
): void {
  if (!import.meta.env.DEV) return;
  if (snapshot.metadata.fromCache) return;
  contarLeituras(rotulo, snapshot.docChanges().length);
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as { __leituras: (() => void) & { reset: () => void } };
  const mostrar = () => {
    const linhas = [...totais.entries()]
      .map(([rotulo, v]) => ({ rotulo, docs: v.docs, chamadas: v.chamadas }))
      .sort((a, b) => b.docs - a.docs);
    const total = linhas.reduce((s, l) => s + l.docs, 0);
    console.table(linhas);
    console.log(`[leituras] total estimado nesta sessão: ${total}`);
  };
  mostrar.reset = () => totais.clear();
  w.__leituras = mostrar;
}
