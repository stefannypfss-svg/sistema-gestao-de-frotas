import { useEffect, useState } from 'react';
import { obterTodosEventosManutencao } from '../services/eventosManutencaoCompartilhados';
import { EventoManutencao } from '../types';

/**
 * Todos os eventos de manutenção, lidos uma vez ao montar (a "foto" não
 * atualiza dentro da tela aberta) — substitui o `list()` por montagem que as
 * telas faziam. A coleção é lida do Firestore uma vez por sessão (ver
 * `services/eventosManutencaoCompartilhados.ts`).
 */
export function useEventosManutencaoTodos(): EventoManutencao[] {
  const [eventos, setEventos] = useState<EventoManutencao[]>([]);
  useEffect(() => {
    let cancelado = false;
    obterTodosEventosManutencao().then((todos) => {
      if (!cancelado) setEventos(todos);
    });
    return () => {
      cancelado = true;
    };
  }, []);
  return eventos;
}
