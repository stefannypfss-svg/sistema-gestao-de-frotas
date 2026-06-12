import { useState, useEffect } from 'react';
import { Equipment, Allocation, Work } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

const KEYS = {
  EQUIPMENT: 'cortez_equipamentos',
  ALLOCATIONS: 'cortez_alocacoes',
  WORKS: 'cortez_obras',
  LAST_MODIFIED: 'cortez_last_modified',
};

const INITIAL_WORKS: Work[] = [
  {"id":"1","nome":"Dom Inocêncio","cliente":"","status":"Ativa","observacoes":""},
  {"id":"2","nome":"Babilônia Solar","cliente":"","status":"Ativa","observacoes":""},
  {"id":"3","nome":"Babilônia Centro","cliente":"","status":"Ativa","observacoes":""},
  {"id":"4","nome":"Britageo - Caucaia - CE","cliente":"Britageo","status":"Ativa","observacoes":""},
  {"id":"5","nome":"Pedra de Amolar e Paraíso Farol","cliente":"","status":"Ativa","observacoes":""},
  {"id":"6","nome":"Passareli - Cinturão das Águas do Ceará L4 - Ceará","cliente":"Passareli","status":"Ativa","observacoes":""},
  {"id":"7","nome":"Alliance","cliente":"Alliance","status":"Ativa","observacoes":""},
  {"id":"8","nome":"Teci Infraestrutura - Fortaleza - CE","cliente":"Teci","status":"Ativa","observacoes":""},
  {"id":"9","nome":"Cortez - Itarema - CE","cliente":"Cortez","status":"Ativa","observacoes":""}
];

export function useStore() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedEquip = localStorage.getItem(KEYS.EQUIPMENT);
    const storedAlloc = localStorage.getItem(KEYS.ALLOCATIONS);
    const storedWorks = localStorage.getItem(KEYS.WORKS);

    let initialEquip: Equipment[] = [];
    let initialAlloc: Allocation[] = [];
    let currentWorks: Work[] = [];

    if (storedEquip) {
      initialEquip = JSON.parse(storedEquip);
    } else {
      initialEquip = INITIAL_EQUIPMENT;
      localStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(initialEquip));
    }

    if (storedWorks) {
      currentWorks = JSON.parse(storedWorks);
    } else {
      currentWorks = INITIAL_WORKS;
      localStorage.setItem(KEYS.WORKS, JSON.stringify(currentWorks));
    }

    if (storedAlloc) {
      initialAlloc = JSON.parse(storedAlloc);
    } else {
      // Create auto-allocations for equipment not in central
      initialAlloc = initialEquip
        .filter(eq => eq.localizacaoAtual !== "Central de Equipamentos Rental" && eq.status === 'Locado')
        .map((eq, index) => ({
          id: `initial-${index}`,
          prefixo: eq.prefixo,
          obra: eq.localizacaoAtual,
          tipo: 'Atual',
          statusAlocacao: 'Confirmado',
          dataMobilizacao: new Date(2024, 0, 1).toISOString(), // Assume start of year for initial data
          dataDesmobilizacao: null,
          dataMobilizacaoReal: new Date(2024, 0, 1).toISOString(),
          dataDesmobilizacaoReal: null,
          valorLocacao: eq.valorLocacao,
          observacoes: 'Alocação inicial automática'
        }));
      localStorage.setItem(KEYS.ALLOCATIONS, JSON.stringify(initialAlloc));
    }

    const storedLastModified = localStorage.getItem(KEYS.LAST_MODIFIED);
    const lastModifiedValue = storedLastModified || new Date().toISOString();

    if (!storedLastModified) {
      localStorage.setItem(KEYS.LAST_MODIFIED, lastModifiedValue);
    }

    setEquipments(initialEquip);
    setAllocations(initialAlloc);
    setWorks(currentWorks);
    setLastModified(lastModifiedValue);
    setIsLoaded(true);
  }, []);

  const saveEquipments = (newEquipments: Equipment[]) => {
    const now = new Date().toISOString();
    setEquipments(newEquipments);
    setLastModified(now);
    localStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(newEquipments));
    localStorage.setItem(KEYS.LAST_MODIFIED, now);
  };

  const saveAllocations = (newAllocations: Allocation[]) => {
    const now = new Date().toISOString();
    setAllocations(newAllocations);
    setLastModified(now);
    localStorage.setItem(KEYS.ALLOCATIONS, JSON.stringify(newAllocations));
    localStorage.setItem(KEYS.LAST_MODIFIED, now);
  };

  const saveWorks = (newWorks: Work[]) => {
    const now = new Date().toISOString();
    setWorks(newWorks);
    setLastModified(now);
    localStorage.setItem(KEYS.WORKS, JSON.stringify(newWorks));
    localStorage.setItem(KEYS.LAST_MODIFIED, now);
  };

  return {
    equipments,
    allocations,
    works,
    lastModified,
    saveEquipments,
    saveAllocations,
    saveWorks,
    isLoaded
  };
}
