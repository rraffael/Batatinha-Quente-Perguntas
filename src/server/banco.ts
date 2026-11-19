import type { Config, TemaInfo } from '../shared/protocolo';
import type { Raridade } from '../shared/regras';
import { indexar, type Indice } from './casamento';

export interface RespostaBanco {
  id: string;
  canonica: string;
  aceitas: string[];
  traducoes: string[];
  raridade: Raridade;
}

export interface PerguntaBanco {
  id: string;
  tema: string;
  texto: string;
  dificuldade: 'facil' | 'media' | 'dificil';
  nota?: string;
  respostas: RespostaBanco[];
}

/** Formato compacto gerado por scripts/gerar-banco.mjs. */
export interface DadosBanco {
  temas: TemaInfo[];
  perguntas: {
    id: string;
    tema: string;
    texto: string;
    dificuldade: 'facil' | 'media' | 'dificil';
    nota?: string;
    respostas: { id: string; c: string; a: string[]; t: string[]; r: Raridade }[];
  }[];
}

export interface FonteBanco {
  temas: readonly TemaInfo[];
  pergunta(id: string): PerguntaBanco | undefined;
  indice(id: string): Indice;
  nomeTema(id: string): string;
  /** Ids das perguntas que entram na rotação para essa configuração. */
  elegiveis(config: Config): string[];
}

export function criarBanco(dados: DadosBanco): FonteBanco {
  const perguntas = new Map<string, PerguntaBanco>();
  for (const p of dados.perguntas) {
    perguntas.set(p.id, {
      id: p.id,
      tema: p.tema,
      texto: p.texto,
      dificuldade: p.dificuldade,
      nota: p.nota,
      respostas: p.respostas.map((r) => ({ id: r.id, canonica: r.c, aceitas: r.a, traducoes: r.t, raridade: r.r })),
    });
  }
  const nomes = new Map(dados.temas.map((t) => [t.id, t.nome]));
  const opcionais = new Set(dados.temas.filter((t) => t.opcional).map((t) => t.id));
  const indices = new Map<string, Indice>();

  return {
    temas: dados.temas,
    pergunta: (id) => perguntas.get(id),
    nomeTema: (id) => nomes.get(id) ?? id,
    indice(id) {
      let indice = indices.get(id);
      if (!indice) {
        const p = perguntas.get(id);
        if (!p) throw new Error(`Pergunta inexistente: ${id}`);
        indice = indexar(
          p.respostas.map((r) => ({ id: r.id, formas: [r.canonica, ...r.aceitas], traducoes: r.traducoes })),
        );
        indices.set(id, indice);
      }
      return indice;
    },
    elegiveis(config) {
      const filtrar = (comDificeis: boolean) =>
        [...perguntas.values()]
          .filter((p) => (config.temas.length === 0 ? !opcionais.has(p.tema) : config.temas.includes(p.tema)))
          .filter((p) => comDificeis || p.dificuldade !== 'dificil')
          .map((p) => p.id);
      let ids = filtrar(config.dificeis);
      if (ids.length === 0) ids = filtrar(true);
      if (ids.length === 0) ids = [...perguntas.keys()];
      return ids;
    },
  };
}
