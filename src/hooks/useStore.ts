import { useCollection } from './useCollection';
import {
  equipmentRepository,
  workRepository,
  allocationRepository,
} from '../services';

/**
 * Agrega as três coleções do domínio num único ponto de consumo.
 *
 * Cada coleção expõe `items`, `loading`, `error` e operações assíncronas
 * (`create`/`update`/`remove`). A origem dos dados é definida em `services/`.
 */
export function useStore() {
  const equipments = useCollection(equipmentRepository);
  const works = useCollection(workRepository);
  const allocations = useCollection(allocationRepository);

  return {
    equipments,
    works,
    allocations,
    isLoading: equipments.loading || works.loading || allocations.loading,
    error: equipments.error ?? works.error ?? allocations.error,
  };
}
