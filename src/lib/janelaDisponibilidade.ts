/**
 * Helpers puros da assinatura compartilhada de `disponibilidade`
 * (ver `hooks/useDisponibilidadeLazy.ts`).
 *
 * A assinatura única mantém uma janela de datas que só cresce durante a
 * sessão; cada tela vê apenas o recorte `[ini, fim]` que pediu — exatamente
 * o conjunto que a query `data >= ini && data <= fim` devolveria.
 */
import { DisponibilidadeRecord } from '../types';

export interface Janela {
  ini: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
}

/** Menor janela que contém `a` e `b`. */
export function uniaoJanelas(a: Janela, b: Janela): Janela {
  return { ini: a.ini < b.ini ? a.ini : b.ini, fim: a.fim > b.fim ? a.fim : b.fim };
}

/** `externa` contém `interna` por inteiro? */
export function janelaCobre(externa: Janela, interna: Janela): boolean {
  return externa.ini <= interna.ini && externa.fim >= interna.fim;
}

/**
 * Mesmo critério da query do Firestore (`where data >= ini` e `data <= fim`,
 * comparação de strings): documento sem `data` não entra.
 */
export function recortarPorData(
  items: DisponibilidadeRecord[],
  { ini, fim }: Janela,
): DisponibilidadeRecord[] {
  return items.filter((r) => typeof r.data === 'string' && r.data >= ini && r.data <= fim);
}
