import { describe, expect, it } from 'vitest';
import { casar, distancia, indexar } from '../src/server/casamento';
import { normalizar } from '../src/shared/normalizar';

const indice = indexar([
  { id: 'gato', formas: ['Gato'], traducoes: ['Cat'] },
  { id: 'rato', formas: ['Rato'], traducoes: [] },
  { id: 'alemanha', formas: ['Alemanha'], traducoes: ['Germany', 'Alemania'] },
  { id: 'brasil', formas: ['Brasil'], traducoes: [] },
  { id: 'brasilia', formas: ['Brasília'], traducoes: [] },
  { id: 'toy-story', formas: ['Toy Story'], traducoes: [] },
  { id: 'toy-story-2', formas: ['Toy Story 2'], traducoes: [] },
  { id: 'gambia', formas: ['Gâmbia'], traducoes: [] },
  { id: 'zambia', formas: ['Zâmbia'], traducoes: [] },
  { id: 'eua', formas: ['Estados Unidos', 'EUA', 'USA'], traducoes: [] },
  { id: 'chitaozinho', formas: ['Chitãozinho & Xororó'], traducoes: [] },
]);
const nenhuma = new Set<string>();

describe('normalizar', () => {
  it('remove acento, caixa, pontuação e trata &', () => {
    expect(normalizar('  São-Paulo!! ')).toBe('sao paulo');
    expect(normalizar('Chitãozinho & Xororó')).toBe('chitaozinho e xororo');
    expect(normalizar('Ação')).toBe('acao');
  });
});

describe('casar', () => {
  it('aceita exato, sem acento e sem caixa', () => {
    expect(casar(indice, 'brasilia', nenhuma)).toEqual({ ok: true, id: 'brasilia' });
    expect(casar(indice, 'BRASIL', nenhuma)).toEqual({ ok: true, id: 'brasil' });
    expect(casar(indice, 'usa', nenhuma)).toEqual({ ok: true, id: 'eua' });
    expect(casar(indice, 'chitaozinho e xororo', nenhuma)).toEqual({ ok: true, id: 'chitaozinho' });
  });

  it('exato tem prioridade sobre prefixo (Brasil x Brasília, Toy Story x Toy Story 2)', () => {
    expect(casar(indice, 'Brasil', nenhuma)).toEqual({ ok: true, id: 'brasil' });
    expect(casar(indice, 'toy story', nenhuma)).toEqual({ ok: true, id: 'toy-story' });
    expect(casar(indice, 'toy story 2', nenhuma)).toEqual({ ok: true, id: 'toy-story-2' });
  });

  it('autocompleta com 80% da palavra', () => {
    expect(casar(indice, 'alemanh', nenhuma)).toEqual({ ok: true, id: 'alemanha' });
    expect(casar(indice, 'toy stor', nenhuma)).toEqual({ ok: true, id: 'toy-story' });
    expect(casar(indice, 'ale', nenhuma)).toEqual({ ok: false, motivo: 'desconhecida' });
  });

  it('aceita erro de digitação pequeno em palavras longas', () => {
    expect(casar(indice, 'alemahna', nenhuma)).toEqual({ ok: true, id: 'alemanha' });
    expect(casar(indice, 'estados unidso', nenhuma)).toEqual({ ok: true, id: 'eua' });
  });

  it('não corrige palavra curta para outra resposta (gato x rato)', () => {
    expect(casar(indice, 'pato', nenhuma)).toEqual({ ok: false, motivo: 'desconhecida' });
  });

  it('resposta já usada é recusada como usada, sem virar outra parecida', () => {
    const usadas = new Set(['gato']);
    expect(casar(indice, 'gato', usadas)).toEqual({ ok: false, motivo: 'usada', id: 'gato' });
    expect(casar(indice, 'cat', usadas)).toEqual({ ok: false, motivo: 'usada', id: 'gato' });
  });

  it('erro de digitação ambíguo é recusado (Gâmbia x Zâmbia)', () => {
    expect(casar(indice, 'xambia', nenhuma)).toEqual({ ok: false, motivo: 'ambigua' });
  });

  it('tradução só vale exata', () => {
    expect(casar(indice, 'germany', nenhuma)).toEqual({ ok: true, id: 'alemanha' });
    expect(casar(indice, 'german', nenhuma)).toEqual({ ok: false, motivo: 'desconhecida' });
  });

  it('entrada vazia', () => {
    expect(casar(indice, '  !! ', nenhuma)).toEqual({ ok: false, motivo: 'vazia' });
  });
});

describe('distancia', () => {
  it('calcula Damerau-Levenshtein com transposição', () => {
    expect(distancia('gato', 'gato')).toBe(0);
    expect(distancia('gato', 'rato')).toBe(1);
    expect(distancia('alemahna', 'alemanha')).toBe(1);
    expect(distancia('abc', 'xyz', 1)).toBe(2);
  });
});
