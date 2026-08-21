import { useCollection } from './useCollection';
import { useAuth } from './useAuth';
import {
  equipmentRepository,
  workRepository,
  allocationRepository,
  equipamentoObraRepository,
  tabelaLocacaoRepository,
  avariaRepository,
} from '../services';

/**
 * Agrega as coleções do domínio num único ponto de consumo.
 *
 * Cada coleção expõe `items`, `loading`, `error` e operações assíncronas
 * (`create`/`update`/`remove`). A origem dos dados é definida em `services/`.
 *
 * `disponibilidade` não entra aqui de propósito: é a maior coleção do
 * sistema (cresce 1 doc/equipamento/dia) e nem toda tela precisa dela. Quem
 * precisa assina sob demanda via `useDisponibilidadeLazy` (Disponibilidade)
 * ou `useDisponibilidadeHoje` (Dashboard, só o dia de hoje).
 */
export function useStore() {
  const { user } = useAuth();
  const userLabel = user?.displayName || user?.email || 'Sistema';

  const equipments = useCollection(equipmentRepository, userLabel);
  const works = useCollection(workRepository, userLabel);
  const allocations = useCollection(allocationRepository, userLabel);
  const equipamentoObra = useCollection(equipamentoObraRepository, userLabel);
  const tabelaLocacao = useCollection(tabelaLocacaoRepository, userLabel);
  const avarias = useCollection(avariaRepository, userLabel);

  return {
    equipments,
    works,
    allocations,
    equipamentoObra,
    tabelaLocacao,
    avarias,
    userLabel,
    isLoading: equipments.loading || works.loading || allocations.loading || equipamentoObra.loading || tabelaLocacao.loading,
    error: equipments.error ?? works.error ?? allocations.error ?? equipamentoObra.error ?? tabelaLocacao.error,
  };
}
