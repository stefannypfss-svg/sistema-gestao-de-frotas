import { useCollection } from './useCollection';
import { useAuth } from './useAuth';
import {
  equipmentRepository,
  workRepository,
  allocationRepository,
  equipamentoObraRepository,
  tabelaLocacaoRepository,
  disponibilidadeRepository,
} from '../services';

/**
 * Agrega as três coleções do domínio num único ponto de consumo.
 *
 * Cada coleção expõe `items`, `loading`, `error` e operações assíncronas
 * (`create`/`update`/`remove`). A origem dos dados é definida em `services/`.
 */
export function useStore() {
  const { user } = useAuth();
  const userLabel = user?.displayName || user?.email || 'Sistema';

  const equipments = useCollection(equipmentRepository, userLabel);
  const works = useCollection(workRepository, userLabel);
  const allocations = useCollection(allocationRepository, userLabel);
  const equipamentoObra = useCollection(equipamentoObraRepository, userLabel);
  const tabelaLocacao = useCollection(tabelaLocacaoRepository, userLabel);
  const disponibilidade = useCollection(disponibilidadeRepository, userLabel);

  return {
    equipments,
    works,
    allocations,
    equipamentoObra,
    tabelaLocacao,
    disponibilidade,
    isLoading: equipments.loading || works.loading || allocations.loading || equipamentoObra.loading || tabelaLocacao.loading,
    error: equipments.error ?? works.error ?? allocations.error ?? equipamentoObra.error ?? tabelaLocacao.error,
  };
}
