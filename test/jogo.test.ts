import { beforeEach, describe, expect, it } from 'vitest';
import { criarBanco, type DadosBanco } from '../src/server/banco';
import {
  avancarTempo,
  configurar,
  criarSala,
  entrar,
  iniciar,
  novaPartida,
  novosEfeitos,
  proximoAlarme,
  publico,
  responder,
  sair,
  type Ctx,
  type EstadoSala,
} from '../src/server/jogo';
import { PENALIDADE_ERRO_MS, RITMOS, raridadesPorUso } from '../src/shared/regras';

const dados: DadosBanco = {
  temas: [{ id: 'teste', nome: 'Teste', qtd: 2 }],
  perguntas: [
    {
      id: 'cores',
      tema: 'teste',
      texto: 'Cite uma cor primária',
      dificuldade: 'facil',
      respostas: [
        { id: 'azul', c: 'Azul', a: [], t: ['Blue'], r: 'comum' },
        { id: 'vermelho', c: 'Vermelho', a: [], t: [], r: 'incomum' },
        { id: 'amarelo', c: 'Amarelo', a: [], t: [], r: 'lendario' },
      ],
    },
    {
      id: 'frutas',
      tema: 'teste',
      texto: 'Cite uma fruta',
      dificuldade: 'facil',
      respostas: [
        { id: 'banana', c: 'Banana', a: [], t: [], r: 'comum' },
        { id: 'maca', c: 'Maçã', a: [], t: [], r: 'epico' },
        { id: 'uva', c: 'Uva', a: [], t: [], r: 'lendario' },
        { id: 'pera', c: 'Pera', a: [], t: [], r: 'raro' },
        { id: 'kiwi', c: 'Kiwi', a: [], t: [], r: 'lendario' },
      ],
    },
  ],
};
const banco = criarBanco(dados);

let agora = 1_000_000;
let s: EstadoSala;

function ctx(): Ctx {
  // rng = 0 → pavio mínimo e embaralhamento determinístico.
  return { agora, rng: () => 0, banco, efeitos: novosEfeitos() };
}

function entrarComo(id: string) {
  return entrar(s, ctx(), { jogadorId: id, segredoHash: `h-${id}`, apelido: id, personagem: 'saci' });
}

function comecar(...ids: string[]) {
  ids.forEach(entrarComo);
  expect(iniciar(s, ctx(), ids[0])).toEqual({ ok: true });
  agora = s.proximaEm!;
  avancarTempo(s, ctx());
  expect(s.fase).toBe('jogando');
}

function daVez() {
  return s.rodada!.vezDe;
}

function respostaLivre(): string {
  const usadas = new Set(s.rodada!.usadas.map((u) => u.id));
  return banco.pergunta(s.rodada!.perguntaId)!.respostas.find((r) => !usadas.has(r.id))!.canonica;
}

beforeEach(() => {
  agora = 1_000_000;
  s = criarSala('BCDF', agora);
});

describe('sala e lobby', () => {
  it('primeiro a entrar é o anfitrião; precisa de 2 para começar', () => {
    entrarComo('ana');
    expect(s.hostId).toBe('ana');
    expect(iniciar(s, ctx(), 'ana').ok).toBe(false);
    entrarComo('bia');
    expect(iniciar(s, ctx(), 'bia').ok).toBe(false); // não é host
    expect(iniciar(s, ctx(), 'ana').ok).toBe(true);
    expect(s.fase).toBe('contagem');
  });

  it('reconexão exige o mesmo segredo', () => {
    entrarComo('ana');
    const r = entrar(s, ctx(), { jogadorId: 'ana', segredoHash: 'outro', apelido: 'x', personagem: 'saci' });
    expect(r.ok).toBe(false);
  });

  it('apelido com palavrão vira o nome do personagem', () => {
    entrar(s, ctx(), { jogadorId: 'x', segredoHash: 'h', apelido: 'seu merda', personagem: 'iara' });
    expect(s.jogadores[0].apelido).toBe('Iara');
  });

  it('quem entra no meio da partida vira espectador', () => {
    comecar('ana', 'bia');
    entrarComo('caio');
    const caio = s.jogadores.find((j) => j.id === 'caio')!;
    expect(caio.espectador).toBe(true);
    expect(caio.vivo).toBe(false);
  });

  it('o pavio nunca vai para o cliente', () => {
    comecar('ana', 'bia');
    const json = JSON.stringify(publico(s, ctx()));
    expect(json).not.toContain('prazo');
    expect(json).not.toContain(String(s.prazo));
  });
});

describe('turnos e pavio', () => {
  it('resposta certa passa a vez e soma pontos pela raridade', () => {
    comecar('ana', 'bia');
    const quem = daVez();
    s.rodada!.perguntaId = 'frutas';
    responder(s, ctx(), quem, 'maca');
    expect(daVez()).not.toBe(quem);
    expect(s.jogadores.find((j) => j.id === quem)!.pontos).toBe(100);
    expect(s.evento).toMatchObject({ tipo: 'aceita', canonica: 'Maçã', raridade: 'epico' });
  });

  it('quem não está com a batata não responde', () => {
    comecar('ana', 'bia');
    const outro = s.ordem.find((id) => id !== daVez())!;
    const antes = JSON.stringify(s.rodada);
    responder(s, ctx(), outro, respostaLivre());
    expect(JSON.stringify(s.rodada)).toBe(antes);
  });

  it('passar com pouco tempo devolve o pavio para o mínimo', () => {
    comecar('ana', 'bia');
    agora = s.prazo! - 2_000;
    responder(s, ctx(), daVez(), respostaLivre());
    expect(s.prazo).toBe(agora + RITMOS.normal.minimo);
  });

  it('resposta errada tira 1 segundo do pavio', () => {
    comecar('ana', 'bia');
    const antes = s.prazo!;
    responder(s, ctx(), daVez(), 'xyzxyz');
    expect(s.prazo).toBe(antes - PENALIDADE_ERRO_MS);
  });

  it('erro que zera o pavio estoura na hora', () => {
    comecar('ana', 'bia');
    const vitima = daVez();
    agora = s.prazo! - 500;
    responder(s, ctx(), vitima, 'xyzxyz');
    expect(s.fase).toBe('intervalo');
    expect(s.jogadores.find((j) => j.id === vitima)!.vidas).toBe(2);
    expect(s.evento).toMatchObject({ tipo: 'estouro', jogadorId: vitima });
  });

  it('pavio acabando sozinho estoura, e quem estourou começa a próxima', () => {
    comecar('ana', 'bia');
    const vitima = daVez();
    agora = proximoAlarme(s)!;
    avancarTempo(s, ctx());
    expect(s.fase).toBe('intervalo');
    expect(s.proximoIniciante).toBe(vitima);
    agora = s.proximaEm!;
    avancarTempo(s, ctx());
    expect(s.fase).toBe('jogando');
    expect(daVez()).toBe(vitima);
  });

  it('respostas esgotadas trocam a pergunta e reiniciam o pavio sem punir', () => {
    comecar('ana', 'bia');
    s.rodada!.perguntaId = 'cores';
    const vidas = s.jogadores.map((j) => j.vidas);
    for (const r of ['azul', 'vermelho', 'amarelo']) {
      agora += 1_000;
      responder(s, ctx(), daVez(), r);
    }
    expect(s.rodada!.perguntaId).toBe('frutas');
    expect(s.rodada!.usadas).toHaveLength(0);
    expect(s.prazo).toBe(agora + RITMOS.normal.min);
    expect(s.jogadores.map((j) => j.vidas)).toEqual(vidas);
    expect(s.evento).toMatchObject({ tipo: 'aceita', trocouPergunta: true });
  });

  it('500 pontos dão uma vida extra, até o teto de 5', () => {
    comecar('ana', 'bia');
    const j = s.jogadores.find((x) => x.id === daVez())!;
    j.bonus = 450;
    s.rodada!.perguntaId = 'frutas';
    responder(s, ctx(), j.id, 'uva'); // lendário = 150
    expect(j.vidas).toBe(4);
    expect(j.bonus).toBe(100);
  });

  it('último vivo vence', () => {
    configurar(s, ctx(), 'ana', {});
    comecar('ana', 'bia');
    for (const j of s.jogadores) j.vidas = 1;
    const vitima = daVez();
    agora = proximoAlarme(s)!;
    avancarTempo(s, ctx());
    expect(s.fase).toBe('fim');
    expect(s.vencedorId).toBe(s.ordem.find((id) => id !== vitima));
    expect(novaPartida(s, ctx(), s.hostId!).ok).toBe(true);
    expect(s.fase).toBe('lobby');
  });

  it('jogador que sai na sua vez passa a batata adiante', () => {
    comecar('ana', 'bia', 'caio');
    const vitima = daVez();
    sair(s, ctx(), vitima);
    expect(s.fase).toBe('jogando');
    expect(daVez()).not.toBe(vitima);
  });
});

describe('raridade por uso', () => {
  it('só recalcula com dados suficientes e segue a distribuição', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `r${i}`);
    expect(raridadesPorUso(ids, new Map([['r0', 10]]))).toBeNull();
    const usos = new Map(ids.map((id, i) => [id, 100 - i * 2]));
    const r = raridadesPorUso(ids, usos)!;
    expect(r.r0).toBe('comum');
    expect(r.r20).toBe('incomum');
    expect(r.r35).toBe('raro');
    expect(r.r42).toBe('epico');
    expect(r.r49).toBe('lendario');
  });
});
