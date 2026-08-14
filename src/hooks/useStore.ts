import { useCollection } from './useCollection';
import { useAuth } from './useAuth';
import {
  equipmentRepository,
  workRepository,
  allocationRepository,
  equipamentoObraRepository,
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

  return {
    equipments,
    works,
    allocations,
    equipamentoObra,
    isLoading: equipments.loading || works.loading || allocations.loading || equipamentoObra.loading,
    error: equipments.error ?? works.error ?? allocations.error ?? equipamentoObra.error,
  };
}
