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
