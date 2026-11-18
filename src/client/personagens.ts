export interface InfoPersonagem {
  id: string;
  nome: string;
  origem: string;
}

export const PERSONAGENS_INFO: InfoPersonagem[] = [
  {
    id: 'saci',
    nome: 'Saci',
    origem:
      'Menino travesso de uma perna só e gorro vermelho, que apronta e some num redemoinho. Lenda com raízes indígenas, africanas e europeias.',
  },
  {
    id: 'curupira',
    nome: 'Curupira',
    origem: 'Guardião da mata com os pés virados para trás, que confunde caçadores com rastros ao contrário. Origem tupi.',
  },
  {
    id: 'iara',
    nome: 'Iara',
    origem: 'A mãe-d’água dos rios, que encanta com seu canto. Lenda de origem indígena (Ypupiara), com influências europeias.',
  },
  {
    id: 'boitata',
    nome: 'Boitatá',
    origem: 'Cobra de fogo que protege os campos de quem os queima. O nome vem do tupi: mboi (cobra) + tatá (fogo). É do fogo dele que vem o "tatá" da batata!',
  },
  {
    id: 'mula-sem-cabeca',
    nome: 'Mula',
    origem: 'A Mula sem cabeça, que solta fogo pelo pescoço e galopa pelas noites do interior. Lenda de origem ibérica.',
  },
  {
    id: 'boto',
    nome: 'Boto',
    origem: 'O boto-cor-de-rosa da Amazônia, que nas festas aparece transformado num moço de chapéu branco.',
  },
  {
    id: 'mapinguari',
    nome: 'Mapinguari',
    origem: 'Gigante peludo da floresta amazônica que, segundo os relatos, tem um olho só e uma boca na barriga.',
  },
  {
    id: 'cuca',
    nome: 'Cuca',
    origem: 'Velha bruxa das cantigas de ninar, que vem buscar quem não quer dormir. Vem da "coca" das tradições ibéricas.',
  },
  {
    id: 'lobisomem',
    nome: 'Lobisomem',
    origem: 'Homem que vira lobo nas noites de lua cheia. Lenda europeia que ganhou versões próprias no interior do Brasil.',
  },
  {
    id: 'caipora',
    nome: 'Caipora',
    origem: 'Protetora dos bichos da mata, montada num porco-do-mato, que dá uma lição em caçadores gananciosos. Origem tupi.',
  },
];

export function nomePersonagem(id: string): string {
  return PERSONAGENS_INFO.find((p) => p.id === id)?.nome ?? id;
}

export const imagemPersonagem = (id: string) => `/personagens/${id}.svg`;
