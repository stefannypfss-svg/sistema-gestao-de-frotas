import { useState, useEffect } from 'react';
import { Equipment, Allocation, Work } from '../types';
import { INITIAL_EQUIPMENT } from '../constants';

const KEYS = {
  EQUIPMENT: 'cortez_equipamentos',
  ALLOCATIONS: 'cortez_alocacoes',
  WORKS: 'cortez_obras',
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

    setEquipments(initialEquip);
    setAllocations(initialAlloc);
    setWorks(currentWorks);
    setIsLoaded(true);
  }, []);

  const saveEquipments = (newEquipments: Equipment[]) => {
    setEquipments(newEquipments);
    localStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(newEquipments));
  };

  const saveAllocations = (newAllocations: Allocation[]) => {
    setAllocations(newAllocations);
    localStorage.setItem(KEYS.ALLOCATIONS, JSON.stringify(newAllocations));
  };

  const saveWorks = (newWorks: Work[]) => {
    setWorks(newWorks);
    localStorage.setItem(KEYS.WORKS, JSON.stringify(newWorks));
  };

  return {
    equipments,
    allocations,
    works,
    saveEquipments,
    saveAllocations,
    saveWorks,
    isLoaded
  };
}
