export type Raridade = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export const RARIDADES: readonly Raridade[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

export const ROTULO_RARIDADE: Record<Raridade, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

/** Pontos de vida extra por raridade no multiplayer (acumulam até PONTOS_POR_VIDA). */
export const PONTOS_MULTI: Record<Raridade, number> = {
  comum: 0,
  incomum: 10,
  raro: 35,
  epico: 100,
  lendario: 150,
};

/** Placar da partida (e do modo solo competitivo, futuro): toda resposta certa pontua. */
export const PONTOS_SOLO: Record<Raridade, number> = {
  comum: 10,
  incomum: 15,
  raro: 30,
  epico: 75,
  lendario: 100,
};

export const PONTOS_POR_VIDA = 250;
export const VIDAS_MAX = 5;
export const VIDAS_PADRAO = 3;
export const PENALIDADE_ERRO_MS = 1000;

export type Ritmo = 'calmo' | 'normal' | 'ligeiro';

/** Pavio oculto: sorteado entre min e max; ao passar com menos que `minimo`, volta para `minimo`. */
export const RITMOS: Record<Ritmo, { min: number; max: number; minimo: number; rotulo: string }> = {
  calmo: { min: 19_000, max: 44_000, minimo: 12_500, rotulo: 'Calmo' },
  normal: { min: 12_500, max: 37_500, minimo: 10_000, rotulo: 'Normal' },
  ligeiro: { min: 9_000, max: 25_000, minimo: 7_500, rotulo: 'Ligeiro' },
};

/**
 * Aviso de que o pavio está acabando: a batata esquenta (nível 1) e depois fica em brasa (nível 2).
 * Só esses dois momentos são revelados; o tempo exato continua secreto.
 */
export const CALOR_MS = [8_000, 3_000] as const;
export type Calor = 0 | 1 | 2;

export const MIN_JOGADORES = 2;
export const MAX_JOGADORES = 10;
export const MAX_NA_SALA = 16; // jogadores + espectadores
export const CONTAGEM_MS = 3_000;
export const INTERVALO_MS = 5_000;
/** Tempo mostrando o último estouro antes do pódio. */
export const ANTES_DO_FIM_MS = 3_500;
export const MAX_APELIDO = 16;
export const MAX_RESPOSTA = 60;

/** Distribuição alvo de raridade dentro de cada pergunta (por posição no ranking de uso). */
export const DISTRIBUICAO_RARIDADE = [0.3, 0.3, 0.2, 0.12, 0.08] as const;
/** Usos mínimos de uma pergunta antes de a raridade passar a vir das estatísticas. */
export const MIN_USOS_PARA_RECALCULAR = 300;

export const PERSONAGENS = [
  'saci',
  'curupira',
  'iara',
  'boitata',
  'mula-sem-cabeca',
  'boto',
  'mapinguari',
  'cuca',
  'lobisomem',
  'caipora',
] as const;
export type Personagem = (typeof PERSONAGENS)[number];

/** Raridade de cada resposta a partir da contagem de usos, ou null se ainda há poucos dados. */
export function raridadesPorUso(
  ids: readonly string[],
  usos: ReadonlyMap<string, number>,
): Record<string, Raridade> | null {
  let total = 0;
  for (const id of ids) total += usos.get(id) ?? 0;
  if (total < MIN_USOS_PARA_RECALCULAR || ids.length === 0) return null;

  // Ordenação estável: empates mantêm a ordem do banco (do mais lembrado ao menos).
  const ordenados = ids
    .map((id, i) => ({ id, i, n: usos.get(id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i);

  const resultado: Record<string, Raridade> = {};
  ordenados.forEach(({ id }, posicao) => {
    const fracao = posicao / ids.length;
    let acumulado = 0;
    let nivel = RARIDADES.length - 1;
    for (let k = 0; k < DISTRIBUICAO_RARIDADE.length; k++) {
      acumulado += DISTRIBUICAO_RARIDADE[k];
      if (fracao < acumulado) {
        nivel = k;
        break;
      }
    }
    resultado[id] = RARIDADES[nivel];
  });
  return resultado;
}
