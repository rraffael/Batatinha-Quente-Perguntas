import { describe, expect, it } from 'vitest';
import { BANCO } from '../src/server/banco-padrao';
import { casar } from '../src/server/casamento';

// Regra de ouro 2: toda forma escrita no banco precisa ser reconhecida como a própria resposta.
describe('banco de perguntas real', () => {
  const perguntas = BANCO.elegiveis({
    temas: BANCO.temas.map((t) => t.id),
    dificeis: true,
    vidas: 3,
    ritmo: 'normal',
    maxJogadores: 8,
    publica: false,
  });

  it('tem perguntas com respostas suficientes', () => {
    expect(perguntas.length).toBeGreaterThan(50);
    for (const id of perguntas) expect(BANCO.pergunta(id)!.respostas.length).toBeGreaterThanOrEqual(25);
  });

  it('cada canônica e cada variante aceita casa com a própria resposta', () => {
    const problemas: string[] = [];
    for (const id of perguntas) {
      const p = BANCO.pergunta(id)!;
      const indice = BANCO.indice(id);
      for (const r of p.respostas) {
        for (const forma of [r.canonica, ...r.aceitas, ...r.traducoes]) {
          const res = casar(indice, forma, new Set());
          if (!res.ok || res.id !== r.id) {
            problemas.push(`${id}: "${forma}" (${r.id}) → ${res.ok ? res.id : res.motivo}`);
          }
        }
      }
    }
    expect(problemas).toEqual([]);
  });
});

// Nomes que só diferem pelo número (Ramsés I, Ramsés II) são uma resposta só, valendo com ou
// sem número, em romano ou algarismo. Obras e produtos (filmes, séries, animes, novelas, jogos,
// consoles) são exceção: cada número é uma resposta separada.
describe('respostas numeradas', () => {
  const TEMAS_OBRAS = new Set(['cinema-tv', 'anime-desenho', 'novelas-tv-br', 'games']);
  // Pessoas que também tinham um nome numerado, mas não são do grupo com o nome sem número
  // (Akhenaton era Amenófis IV; Cesarião era Ptolomeu XV). Para elas, só o algarismo é checado.
  const NOME_PROPRIO = new Set(['his-faraos#akhenaton', 'his-faraos#cesariao']);
  const ROMANO = /\s(X{0,3}(?:IX|IV|V?I{0,3}))$/;
  const VALOR: Record<string, number> = { I: 1, V: 5, X: 10 };
  const paraNumero = (r: string) =>
    [...r].reduce((t, c, i) => t + (VALOR[c] < (VALOR[r[i + 1]] ?? 0) ? -VALOR[c] : VALOR[c]), 0);
  const todas = BANCO.elegiveis({
    temas: BANCO.temas.map((t) => t.id),
    dificeis: true,
    vidas: 3,
    ritmo: 'normal',
    maxJogadores: 8,
    publica: false,
  });

  it('o nome sem número e a versão em algarismo caem na mesma resposta', () => {
    const problemas: string[] = [];
    for (const id of todas) {
      const p = BANCO.pergunta(id)!;
      if (TEMAS_OBRAS.has(p.tema)) continue;
      const indice = BANCO.indice(id);
      for (const r of p.respostas) {
        for (const forma of [r.canonica, ...r.aceitas]) {
          const m = forma.match(ROMANO);
          if (!m || !m[1]) continue;
          const base = forma.slice(0, m.index);
          const algarismo = `${base} ${paraNumero(m[1])}`;
          const tentativas = NOME_PROPRIO.has(`${id}#${r.id}`) ? [algarismo] : [base, algarismo];
          for (const tentativa of tentativas) {
            const res = casar(indice, tentativa, new Set());
            // A base pode não existir sozinha (Amósis I não vira "Amósis" se não houver forma);
            // o que não pode é cair em OUTRA resposta ou ficar ambígua.
            if (res.ok ? res.id !== r.id : res.motivo === 'ambigua') {
              problemas.push(`${id}: "${tentativa}" (de "${forma}", ${r.id}) → ${res.ok ? res.id : res.motivo}`);
            }
          }
        }
      }
    }
    expect(problemas).toEqual([]);
  });
});
