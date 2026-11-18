import { normalizar } from '../shared/normalizar';

export interface RespostaParaIndice {
  id: string;
  /** Formas em português: canônica + aceitas (valem exato, prefixo e erro de digitação). */
  formas: readonly string[];
  /** Traduções (valem só se digitadas exatamente). */
  traducoes: readonly string[];
}

interface Forma {
  f: string;
  id: string;
}

export interface Indice {
  exato: Map<string, string>;
  /** Só formas em português, para prefixo e erro de digitação. */
  formasPt: Forma[];
  total: number;
}

export type ResultadoCasamento =
  | { ok: true; id: string }
  | { ok: false; motivo: 'vazia' | 'desconhecida' | 'ambigua' }
  | { ok: false; motivo: 'usada'; id: string };

/** Fração mínima da forma que precisa ser digitada para o autocompletar aceitar. */
export const FRACAO_PREFIXO = 0.8;

export function indexar(respostas: readonly RespostaParaIndice[]): Indice {
  const exato = new Map<string, string>();
  const formasPt: Forma[] = [];
  const vistas = new Set<string>();

  for (const r of respostas) {
    for (const bruta of r.formas) {
      const f = normalizar(bruta);
      if (!f) continue;
      if (!exato.has(f)) exato.set(f, r.id);
      const chave = `${r.id}\u0000${f}`;
      if (!vistas.has(chave)) {
        vistas.add(chave);
        formasPt.push({ f, id: r.id });
      }
    }
  }
  // Traduções entram depois: nunca roubam uma forma em português.
  for (const r of respostas) {
    for (const bruta of r.traducoes) {
      const f = normalizar(bruta);
      if (f && !exato.has(f)) exato.set(f, r.id);
    }
  }
  return { exato, formasPt, total: respostas.length };
}

/**
 * Ordem: exato → prefixo (≥80% da forma) → erro de digitação pequeno.
 * Prefixo e erro de digitação consideram TODAS as respostas (inclusive já usadas):
 * se houver mais de um candidato, é ambíguo; se o único candidato já foi usado, é "usada".
 */
export function casar(indice: Indice, texto: string, usadas: ReadonlySet<string>): ResultadoCasamento {
  const n = normalizar(texto);
  if (!n) return { ok: false, motivo: 'vazia' };

  const exato = indice.exato.get(n);
  if (exato !== undefined) return decidir(new Set([exato]), usadas);

  if (n.length >= 2) {
    const porPrefixo = new Set<string>();
    for (const { f, id } of indice.formasPt) {
      if (f.length > n.length && f.startsWith(n) && n.length >= FRACAO_PREFIXO * f.length) porPrefixo.add(id);
    }
    if (porPrefixo.size > 0) return decidir(porPrefixo, usadas);
  }

  if (n.length >= 5) {
    const limite = n.length >= 9 ? 2 : 1;
    const porDigitacao = new Set<string>();
    for (const { f, id } of indice.formasPt) {
      if (f.length < 5 || Math.abs(f.length - n.length) > limite) continue;
      if (distancia(n, f, limite) <= limite) porDigitacao.add(id);
    }
    if (porDigitacao.size > 0) return decidir(porDigitacao, usadas);
  }

  return { ok: false, motivo: 'desconhecida' };
}

function decidir(candidatos: Set<string>, usadas: ReadonlySet<string>): ResultadoCasamento {
  if (candidatos.size > 1) return { ok: false, motivo: 'ambigua' };
  const [id] = candidatos;
  return usadas.has(id) ? { ok: false, motivo: 'usada', id } : { ok: true, id };
}

/** Distância de Damerau-Levenshtein (transposição adjacente), com corte em `limite`. */
export function distancia(a: string, b: string, limite = Infinity): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > limite) return limite + 1;
  let anterior2 = new Array<number>(n + 1).fill(0);
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  let atual = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    atual[0] = i;
    let menorDaLinha = atual[0];
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, anterior2[j - 2] + 1);
      }
      atual[j] = v;
      if (v < menorDaLinha) menorDaLinha = v;
    }
    if (menorDaLinha > limite) return limite + 1;
    [anterior2, anterior, atual] = [anterior, atual, anterior2];
  }
  return anterior[n];
}
