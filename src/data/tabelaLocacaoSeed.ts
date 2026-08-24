import { TabelaLocacao } from '../types';

export const OBRAS_SEM_VALOR = [
  'Central de Equipamentos Rental',
  'Manutenção Terceirizada',
  'Alliance',
];

const OBRAS_COM_TABELA = ['Dom Inocêncio', 'Esquina dos Ventos'];

const VALORES_PADRAO: Record<string, number> = {
  'BOMBA LANÇA ENTRE 36-39M': 64000,
  'CAMINHÃO BETONEIRA DE 8M³': 27000,
  'CAMINHONETE COMBOIO COM CAP. ATÉ 1.500L': 12000,
  'CAMINHÃO COMBOIO COM CAP. ENTRE 4.501-7.000L': 20000,
  'CAMINHÃO MUNCK 6X4 (TRAÇADO) CAP. IÇAM. 40-49TON/M': 23000,
  'CAMINHÃO OFICINA': 21000,
  'ESCAVADEIRA ENTRE 31-37TON (SIMILAR A 336, JD350G)': 42000,
  'ESCAVADEIRA ENTRE 20-22TON (SIMILAR A 320, CX220)': 24000,
  'MOTONIVELADORA 140, 865B, JD620G MAIOR OU SIMILAR (171 A 260 HP)': 39000,
  'PÁ CARREGADEIRA 924, CASE 521, W300, JD524 OU SIMILAR (ATÉ 2M³)': 20000,
  'PÁ CARREGADEIRA 938, CASE 621, JD624 OU SIMILAR E MAIOR (ACIMA DE 2M³)': 22000,
  'PLATAFORMA AÉREA ATÉ 18M': 20800,
  'ROLO VIBRATÓRIO LISO/PATA': 17000,
  'TRATOR DE ESTEIRA D6T, 850J OU SIMILAR (161 A 230 HP)': 45000,
  'RECICLADORA DE SOLOS': 120000,
  'Caminhão pipa 6x4 (traçado)': 18000,
  'Cavalo mecânico 6x4 (traçado)': 25000,
  'Bomba lança até 35m': 55000,
  'Trator de esteira D8T ou similar (231 a 380 hp)': 45000,
};

/** `/` quebra o ID de documento do Firestore (é o separador de caminho) — troca por `-`. */
function semBarra(texto: string): string {
  return texto.replace(/\//g, '-');
}

export function makeTabelaLocacaoId(descricao: string, obra: string): string {
  return `${semBarra(descricao)}||${semBarra(obra)}`;
}

export function buildTabelaLocacaoSeed(): TabelaLocacao[] {
  const items: TabelaLocacao[] = [];
  for (const [descricao, valor] of Object.entries(VALORES_PADRAO)) {
    for (const obra of OBRAS_COM_TABELA) {
      items.push({
        id: makeTabelaLocacaoId(descricao, obra),
        descricao,
        obra,
        valor,
      });
    }
  }
  return items;
}
