export type TabId = 'equipamentos' | 'obras' | 'planejamento' | 'previsao';

export interface Tab {
  id: TabId;
  label: string;
}

export const TABS: Tab[] = [
  { id: 'equipamentos', label: 'Equipamentos' },
  { id: 'obras', label: 'Obras' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'previsao', label: 'Previsão de Receitas' },
];
