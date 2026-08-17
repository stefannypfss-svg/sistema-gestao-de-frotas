export type TabId = 'dashboard' | 'dados-tecnicos' | 'equip-por-obra' | 'obras' | 'planejamento' | 'previsao';

export interface Tab {
  id: TabId;
  label: string;
}

export const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'dados-tecnicos', label: 'Dados Técnicos' },
  { id: 'equip-por-obra', label: 'Equip. por Obra' },
  { id: 'obras', label: 'Obras' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'previsao', label: 'Previsão de Receitas' },
];
