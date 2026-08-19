export type TabId = 'dashboard' | 'dados-tecnicos' | 'equip-por-obra' | 'disponibilidade' | 'controle-avarias' | 'obras' | 'planejamento' | 'previsao' | 'tabela-locacao';

export interface Tab {
  id: TabId;
  label: string;
}

export const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'dados-tecnicos', label: 'Dados Técnicos' },
  { id: 'equip-por-obra', label: 'Equip. por Obra' },
  { id: 'disponibilidade', label: 'Disponibilidade' },
  { id: 'controle-avarias', label: 'Controle de Avarias' },
  { id: 'obras', label: 'Obras' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'previsao', label: 'Previsão de Receitas' },
  { id: 'tabela-locacao', label: 'Tabela de Locação' },
];
