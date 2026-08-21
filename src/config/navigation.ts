export type TabId = 'dashboard' | 'dados-tecnicos' | 'equip-por-obra' | 'disponibilidade' | 'manutencao' | 'controle-avarias' | 'obras' | 'planejamento' | 'previsao' | 'tabela-locacao';

export interface Tab {
  id: TabId;
  label: string;
}

export const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'dados-tecnicos', label: 'Inventário' },
  { id: 'equip-por-obra', label: 'EquipxObra' },
  { id: 'disponibilidade', label: 'Disponibilidade' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'controle-avarias', label: 'Avarias' },
  { id: 'obras', label: 'Obras' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'previsao', label: 'Projeção' },
  { id: 'tabela-locacao', label: 'Tarifário' },
];
