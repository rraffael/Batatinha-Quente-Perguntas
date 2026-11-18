// Tudo aqui é "estritamente necessário" (id do jogador e preferências): não exige consentimento.
// O acesso ao storage pode falhar (aba anônima, bloqueio), então tudo tem plano B em memória.
const memoria = new Map<string, string>();

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave) ?? memoria.get(chave) ?? null;
  } catch {
    return memoria.get(chave) ?? null;
  }
}

function gravar(chave: string, valor: string): void {
  memoria.set(chave, valor);
  try {
    localStorage.setItem(chave, valor);
  } catch {}
}

function aleatorio(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface Identidade {
  jogadorId: string;
  segredo: string;
}

export function identidade(): Identidade {
  let jogadorId = ler('bq.id');
  let segredo = ler('bq.segredo');
  if (!jogadorId || !segredo) {
    jogadorId = aleatorio();
    segredo = aleatorio() + aleatorio();
    gravar('bq.id', jogadorId);
    gravar('bq.segredo', segredo);
  }
  return { jogadorId, segredo };
}

export const preferencias = {
  apelido: () => ler('bq.apelido') ?? '',
  personagem: () => ler('bq.personagem') ?? 'saci',
  salvar(apelido: string, personagem: string) {
    gravar('bq.apelido', apelido);
    gravar('bq.personagem', personagem);
  },
};

export type Tema = 'claro' | 'escuro' | 'sistema';

export function temaAtual(): Tema {
  const t = ler('bq.tema');
  return t === 'claro' || t === 'escuro' ? t : 'sistema';
}

export function aplicarTema(tema: Tema = temaAtual()): void {
  const raiz = document.documentElement;
  if (tema === 'sistema') delete raiz.dataset.theme;
  else raiz.dataset.theme = tema === 'escuro' ? 'dark' : 'light';
  gravar('bq.tema', tema);
}

/** Apaga tudo que o jogo guardou neste navegador. */
export function apagarDados(): void {
  memoria.clear();
  try {
    for (const chave of Object.keys(localStorage)) if (chave.startsWith('bq.')) localStorage.removeItem(chave);
  } catch {}
}
