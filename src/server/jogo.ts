// Motor do jogo: lógica pura, sem rede nem storage. O tempo e o acaso entram pelo Ctx.
import { temPalavrao } from '../shared/filtro';
import type {
  Config,
  Evento,
  Fase,
  JogadorPublico,
  MotivoRecusa,
  MsgServidor,
  NaoDita,
  SalaPublica,
} from '../shared/protocolo';
import {
  CONTAGEM_MS,
  INTERVALO_MS,
  MAX_APELIDO,
  MAX_JOGADORES,
  MAX_NA_SALA,
  MAX_RESPOSTA,
  MIN_JOGADORES,
  PENALIDADE_ERRO_MS,
  PERSONAGENS,
  PONTOS_MULTI,
  PONTOS_POR_VIDA,
  RARIDADES,
  RITMOS,
  VIDAS_MAX,
  VIDAS_PADRAO,
  type Raridade,
  type Ritmo,
} from '../shared/regras';
import { normalizar } from '../shared/normalizar';
import type { FonteBanco } from './banco';
import { casar } from './casamento';

export interface Jogador extends Omit<JogadorPublico, 'host'> {
  segredoHash: string;
}

interface Uso {
  id: string;
  canonica: string;
  raridade: Raridade;
  pontos: number;
  por: string;
}

export interface Rodada {
  numero: number;
  perguntaId: string;
  vezDe: string;
  usadas: Uso[];
  /** Raridades vindas das estatísticas (sobrepõem as do banco). */
  raridades: Record<string, Raridade> | null;
  /** Tentativas não reconhecidas (normalizadas), para melhorar o banco. */
  recusadas: string[];
}

export interface EstadoSala {
  codigo: string;
  hostId: string | null;
  fase: Fase;
  config: Config;
  jogadores: Jogador[];
  ordem: string[];
  banidos: string[];
  rodada: Rodada | null;
  /** Instante em que o pavio estoura. NUNCA vai para o cliente. */
  prazo: number | null;
  proximaEm: number | null;
  proximoIniciante: string | null;
  numeroRodada: number;
  saco: string[];
  evento: Evento | null;
  seq: number;
  vencedorId: string | null;
  atualizadaEm: number;
}

export interface Estatistica {
  perguntaId: string;
  usados: string[];
  recusadas: string[];
}

export interface Efeitos {
  privadas: { jogadorId: string; msg: MsgServidor }[];
  estatisticas: Estatistica[];
  expulsos: string[];
  /** Pergunta nova cujas raridades podem ser buscadas nas estatísticas. */
  carregarRaridade: string | null;
}

export interface Ctx {
  agora: number;
  rng: () => number;
  banco: FonteBanco;
  efeitos: Efeitos;
}

export type Falha = { ok: false; codigo: string; mensagem: string };
export type Resultado = { ok: true } | Falha;

const OK: Resultado = { ok: true };
const falha = (codigo: string, mensagem: string): Falha => ({ ok: false, codigo, mensagem });

export function novosEfeitos(): Efeitos {
  return { privadas: [], estatisticas: [], expulsos: [], carregarRaridade: null };
}

export function configPadrao(): Config {
  return { temas: [], dificeis: false, vidas: VIDAS_PADRAO, ritmo: 'normal', maxJogadores: 8 };
}

export function criarSala(codigo: string, agora: number): EstadoSala {
  return {
    codigo,
    hostId: null,
    fase: 'lobby',
    config: configPadrao(),
    jogadores: [],
    ordem: [],
    banidos: [],
    rodada: null,
    prazo: null,
    proximaEm: null,
    proximoIniciante: null,
    numeroRodada: 0,
    saco: [],
    evento: null,
    seq: 0,
    vencedorId: null,
    atualizadaEm: agora,
  };
}

// ---------------------------------------------------------------- utilidades

function jogador(s: EstadoSala, id: string | null | undefined): Jogador | undefined {
  return id ? s.jogadores.find((j) => j.id === id) : undefined;
}

function embaralhar<T>(lista: T[], rng: () => number): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const k = Math.floor(rng() * (i + 1));
    [r[i], r[k]] = [r[k], r[i]];
  }
  return r;
}

function sortearPavio(s: EstadoSala, ctx: Ctx): number {
  const { min, max } = RITMOS[s.config.ritmo];
  return ctx.agora + min + Math.floor(ctx.rng() * (max - min + 1));
}

/** Próximo jogador vivo depois de `id` na ordem da roda (pode ser o próprio, se for o único). */
function proximoVivo(s: EstadoSala, id: string): string | null {
  const vivos = new Set(s.jogadores.filter((j) => j.vivo).map((j) => j.id));
  if (vivos.size === 0) return null;
  const i = s.ordem.indexOf(id);
  for (let passo = 1; passo <= s.ordem.length; passo++) {
    const candidato = s.ordem[(Math.max(i, 0) + passo) % s.ordem.length];
    if (vivos.has(candidato)) return candidato;
  }
  return null;
}

function emitir(s: EstadoSala, evento: Omit<Evento, 'seq'>): void {
  s.seq += 1;
  s.evento = { ...evento, seq: s.seq } as Evento;
}

function limparApelido(bruto: string, personagem: string): string {
  const limpo = bruto
    .replace(/[\p{C}<>]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_APELIDO);
  if (!limpo || temPalavrao(limpo)) {
    const nome = personagem.replace(/-/g, ' ');
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }
  return limpo;
}

function passarHost(s: EstadoSala): void {
  const atual = jogador(s, s.hostId);
  if (atual && atual.conectado) return;
  const novo = s.jogadores.find((j) => j.conectado && !j.espectador) ?? s.jogadores.find((j) => j.conectado);
  s.hostId = novo?.id ?? atual?.id ?? s.jogadores[0]?.id ?? null;
}

function raridadeDe(s: EstadoSala, ctx: Ctx, perguntaId: string, respostaId: string): Raridade {
  const sobreposta = s.rodada?.perguntaId === perguntaId ? s.rodada.raridades?.[respostaId] : undefined;
  if (sobreposta) return sobreposta;
  return ctx.banco.pergunta(perguntaId)?.respostas.find((r) => r.id === respostaId)?.raridade ?? 'comum';
}

function tirarPergunta(s: EstadoSala, ctx: Ctx): string {
  if (s.saco.length === 0) {
    const atual = s.rodada?.perguntaId;
    const elegiveis = ctx.banco.elegiveis(s.config);
    const semAtual = elegiveis.filter((id) => id !== atual);
    s.saco = embaralhar(semAtual.length > 0 ? semAtual : elegiveis, ctx.rng);
  }
  return s.saco.pop()!;
}

function registrarEstatistica(s: EstadoSala, ctx: Ctx): void {
  const r = s.rodada;
  if (!r || (r.usadas.length === 0 && r.recusadas.length === 0)) return;
  ctx.efeitos.estatisticas.push({
    perguntaId: r.perguntaId,
    usados: r.usadas.map((u) => u.id),
    recusadas: [...r.recusadas],
  });
}

function novaPergunta(s: EstadoSala, ctx: Ctx, vezDe: string): void {
  const perguntaId = tirarPergunta(s, ctx);
  s.rodada = { numero: s.numeroRodada, perguntaId, vezDe, usadas: [], raridades: null, recusadas: [] };
  s.prazo = sortearPavio(s, ctx);
  ctx.efeitos.carregarRaridade = perguntaId;
}

function comecarRodada(s: EstadoSala, ctx: Ctx): void {
  const candidato = jogador(s, s.proximoIniciante);
  const iniciante = candidato?.vivo ? candidato.id : proximoVivo(s, s.proximoIniciante ?? s.ordem[0]);
  if (!iniciante) return encerrar(s, null);
  s.numeroRodada += 1;
  s.fase = 'jogando';
  s.proximaEm = null;
  s.proximoIniciante = null;
  novaPergunta(s, ctx, iniciante);
}

function encerrar(s: EstadoSala, vencedorId: string | null): void {
  s.fase = 'fim';
  s.prazo = null;
  s.proximaEm = null;
  s.vencedorId = vencedorId;
}

function verificarFim(s: EstadoSala): boolean {
  const vivos = s.jogadores.filter((j) => j.vivo);
  if (vivos.length > 1) return false;
  encerrar(s, vivos[0]?.id ?? null);
  return true;
}

function sortearNaoDitas(s: EstadoSala, ctx: Ctx): NaoDita[] {
  const r = s.rodada;
  if (!r) return [];
  const pergunta = ctx.banco.pergunta(r.perguntaId);
  if (!pergunta) return [];
  const usadas = new Set(r.usadas.map((u) => u.id));
  const nivel = (x: Raridade) => RARIDADES.indexOf(x);
  return embaralhar(
    pergunta.respostas.filter((x) => !usadas.has(x.id)),
    ctx.rng,
  )
    .map((x) => ({ canonica: x.canonica, raridade: raridadeDe(s, ctx, r.perguntaId, x.id) }))
    .sort((a, b) => nivel(b.raridade) - nivel(a.raridade))
    .slice(0, 6);
}

function estourar(s: EstadoSala, ctx: Ctx): void {
  const r = s.rodada;
  const vitima = jogador(s, r?.vezDe);
  if (!r || !vitima) {
    s.prazo = null;
    return;
  }
  vitima.vidas = Math.max(0, vitima.vidas - 1);
  const eliminado = vitima.vidas === 0;
  if (eliminado) {
    vitima.vivo = false;
    vitima.eliminadoNaRodada = s.numeroRodada;
  }
  registrarEstatistica(s, ctx);
  const naoDitas = sortearNaoDitas(s, ctx);
  s.prazo = null;

  const fimDeJogo = verificarFim(s);
  if (!fimDeJogo) {
    s.fase = 'intervalo';
    s.proximaEm = ctx.agora + INTERVALO_MS;
    s.proximoIniciante = vitima.vivo ? vitima.id : proximoVivo(s, vitima.id);
  }
  emitir(s, { tipo: 'estouro', jogadorId: vitima.id, eliminado, fimDeJogo, naoDitas });
}

// ---------------------------------------------------------------- ações

export interface DadosEntrada {
  jogadorId: string;
  segredoHash: string;
  apelido: string;
  personagem: string;
}

export function entrar(s: EstadoSala, ctx: Ctx, d: DadosEntrada): Resultado {
  if (s.banidos.includes(d.jogadorId)) return falha('banido', 'Você foi removido desta sala.');
  const personagem = (PERSONAGENS as readonly string[]).includes(d.personagem) ? d.personagem : 'saci';
  const apelido = limparApelido(d.apelido, personagem);
  const existente = jogador(s, d.jogadorId);

  if (existente) {
    if (existente.segredoHash !== d.segredoHash) return falha('id_em_uso', 'Esse jogador já está na sala.');
    existente.conectado = true;
    if (s.fase === 'lobby' || s.fase === 'fim') {
      existente.apelido = apelido;
      existente.personagem = personagem;
    }
  } else {
    if (s.jogadores.length >= MAX_NA_SALA) return falha('sala_cheia', 'A sala está lotada.');
    const espectador = s.fase !== 'lobby';
    const naRoda = s.jogadores.filter((j) => !j.espectador).length;
    if (!espectador && naRoda >= s.config.maxJogadores) return falha('sala_cheia', 'A roda já está completa.');
    s.jogadores.push({
      id: d.jogadorId,
      segredoHash: d.segredoHash,
      apelido,
      personagem,
      vidas: s.config.vidas,
      pontos: 0,
      bonus: 0,
      vivo: !espectador,
      conectado: true,
      espectador,
      acertos: 0,
      lendarias: 0,
      eliminadoNaRodada: null,
    });
  }
  if (!s.hostId || !jogador(s, s.hostId)) s.hostId = d.jogadorId;
  passarHost(s);
  s.atualizadaEm = ctx.agora;
  return OK;
}

export function desconectar(s: EstadoSala, ctx: Ctx, jogadorId: string): void {
  const j = jogador(s, jogadorId);
  if (!j) return;
  j.conectado = false;
  passarHost(s);
  s.atualizadaEm = ctx.agora;
}

export function sair(s: EstadoSala, ctx: Ctx, jogadorId: string): void {
  const j = jogador(s, jogadorId);
  if (!j) return;
  const emJogo = s.fase === 'contagem' || s.fase === 'jogando' || s.fase === 'intervalo';
  const eraAVez = s.fase === 'jogando' && s.rodada?.vezDe === jogadorId;
  const seguinte = eraAVez ? proximoVivo(s, jogadorId) : null;

  s.jogadores = s.jogadores.filter((x) => x.id !== jogadorId);
  s.ordem = s.ordem.filter((id) => id !== jogadorId);
  if (s.proximoIniciante === jogadorId) s.proximoIniciante = proximoVivo(s, jogadorId);
  if (s.hostId === jogadorId) s.hostId = null;
  passarHost(s);
  s.atualizadaEm = ctx.agora;

  if (emJogo && j.vivo && !verificarFim(s) && eraAVez && seguinte && s.rodada) {
    s.rodada.vezDe = seguinte;
  }
}

export function expulsar(s: EstadoSala, ctx: Ctx, hostId: string, alvoId: string): Resultado {
  if (s.hostId !== hostId) return falha('nao_host', 'Só o anfitrião pode remover jogadores.');
  if (alvoId === hostId || !jogador(s, alvoId)) return OK;
  s.banidos.push(alvoId);
  sair(s, ctx, alvoId);
  ctx.efeitos.expulsos.push(alvoId);
  return OK;
}

export function configurar(s: EstadoSala, ctx: Ctx, jogadorId: string, cfg: Partial<Config>): Resultado {
  if (s.hostId !== jogadorId) return falha('nao_host', 'Só o anfitrião muda as configurações.');
  if (s.fase !== 'lobby') return OK;
  const temasValidos = new Set(ctx.banco.temas.map((t) => t.id));
  const c = s.config;
  if (Array.isArray(cfg.temas)) c.temas = [...new Set(cfg.temas.filter((t) => temasValidos.has(t)))];
  if (typeof cfg.dificeis === 'boolean') c.dificeis = cfg.dificeis;
  if (typeof cfg.vidas === 'number') c.vidas = Math.min(VIDAS_MAX, Math.max(1, Math.round(cfg.vidas)));
  if (typeof cfg.ritmo === 'string' && cfg.ritmo in RITMOS) c.ritmo = cfg.ritmo as Ritmo;
  if (typeof cfg.maxJogadores === 'number') {
    c.maxJogadores = Math.min(MAX_JOGADORES, Math.max(MIN_JOGADORES, Math.round(cfg.maxJogadores)));
  }
  for (const j of s.jogadores) j.vidas = c.vidas;
  s.saco = [];
  s.atualizadaEm = ctx.agora;
  return OK;
}

export function iniciar(s: EstadoSala, ctx: Ctx, jogadorId: string): Resultado {
  if (s.hostId !== jogadorId) return falha('nao_host', 'Só o anfitrião pode começar.');
  if (s.fase !== 'lobby') return OK;
  // Quem caiu antes de começar fica de fora desta partida.
  s.jogadores = s.jogadores.filter((j) => j.conectado);
  if (s.jogadores.length < MIN_JOGADORES) return falha('poucos', `Precisa de pelo menos ${MIN_JOGADORES} jogadores.`);
  const naRoda = s.jogadores.slice(0, s.config.maxJogadores);
  for (const j of s.jogadores) {
    const joga = naRoda.includes(j);
    Object.assign(j, {
      vidas: s.config.vidas,
      pontos: 0,
      bonus: 0,
      acertos: 0,
      lendarias: 0,
      vivo: joga,
      espectador: !joga,
      eliminadoNaRodada: null,
    });
  }
  s.ordem = embaralhar(
    naRoda.map((j) => j.id),
    ctx.rng,
  );
  s.saco = [];
  s.rodada = null;
  s.numeroRodada = 0;
  s.vencedorId = null;
  s.fase = 'contagem';
  s.proximaEm = ctx.agora + CONTAGEM_MS;
  s.proximoIniciante = s.ordem[0];
  s.atualizadaEm = ctx.agora;
  emitir(s, { tipo: 'inicio' });
  return OK;
}

export function responder(s: EstadoSala, ctx: Ctx, jogadorId: string, texto: string): void {
  const r = s.rodada;
  if (s.fase !== 'jogando' || !r || r.vezDe !== jogadorId || s.prazo === null) return;
  const j = jogador(s, jogadorId);
  if (!j) return;
  const digitado = texto.slice(0, MAX_RESPOSTA);
  const resultado = casar(
    ctx.banco.indice(r.perguntaId),
    digitado,
    new Set(r.usadas.map((u) => u.id)),
  );
  s.atualizadaEm = ctx.agora;

  if (!resultado.ok) {
    if (resultado.motivo === 'vazia') return;
    const motivo: MotivoRecusa = resultado.motivo;
    const canonica =
      resultado.motivo === 'usada' ? r.usadas.find((u) => u.id === resultado.id)?.canonica : undefined;
    ctx.efeitos.privadas.push({ jogadorId, msg: { t: 'recusada', texto: digitado, motivo, canonica } });
    if (motivo === 'desconhecida' && r.recusadas.length < 30) {
      const n = normalizar(digitado).slice(0, 40);
      if (n && !r.recusadas.includes(n)) r.recusadas.push(n);
    }
    // Errar custa tempo do pavio; "seja mais específico" (ambígua) não pune.
    if (motivo !== 'ambigua') {
      s.prazo -= PENALIDADE_ERRO_MS;
      if (s.prazo <= ctx.agora) estourar(s, ctx);
    }
    return;
  }

  const pergunta = ctx.banco.pergunta(r.perguntaId)!;
  const resposta = pergunta.respostas.find((x) => x.id === resultado.id)!;
  const raridade = raridadeDe(s, ctx, r.perguntaId, resposta.id);
  const pontos = PONTOS_MULTI[raridade];
  j.pontos += pontos;
  j.bonus += pontos;
  j.acertos += 1;
  if (raridade === 'lendario') j.lendarias += 1;
  let ganhouVida = false;
  while (j.bonus >= PONTOS_POR_VIDA) {
    j.bonus -= PONTOS_POR_VIDA;
    if (j.vidas < VIDAS_MAX) {
      j.vidas += 1;
      ganhouVida = true;
    }
  }
  r.usadas.push({ id: resposta.id, canonica: resposta.canonica, raridade, pontos, por: jogadorId });

  const seguinte = proximoVivo(s, jogadorId) ?? jogadorId;
  const esgotou = r.usadas.length >= pergunta.respostas.length;
  if (esgotou) {
    // Todas as respostas foram ditas: troca a pergunta e reinicia o pavio, sem punir ninguém.
    registrarEstatistica(s, ctx);
    novaPergunta(s, ctx, seguinte);
  } else {
    r.vezDe = seguinte;
    const minimo = RITMOS[s.config.ritmo].minimo;
    if (s.prazo - ctx.agora < minimo) s.prazo = ctx.agora + minimo;
  }
  emitir(s, {
    tipo: 'aceita',
    jogadorId,
    canonica: resposta.canonica,
    raridade,
    pontos,
    ganhouVida,
    trocouPergunta: esgotou,
  });
}

/** Chamado pelo alarme: avança contagem/intervalo ou estoura o pavio. */
export function avancarTempo(s: EstadoSala, ctx: Ctx): void {
  const folga = 25;
  if ((s.fase === 'contagem' || s.fase === 'intervalo') && s.proximaEm !== null && ctx.agora + folga >= s.proximaEm) {
    comecarRodada(s, ctx);
  } else if (s.fase === 'jogando' && s.prazo !== null && ctx.agora + folga >= s.prazo) {
    estourar(s, ctx);
  }
}

export function novaPartida(s: EstadoSala, ctx: Ctx, jogadorId: string): Resultado {
  if (s.hostId !== jogadorId) return falha('nao_host', 'Só o anfitrião pode reabrir a roda.');
  if (s.fase !== 'fim') return OK;
  s.jogadores = s.jogadores.filter((j) => j.conectado);
  for (const j of s.jogadores) {
    Object.assign(j, { espectador: false, vivo: true, vidas: s.config.vidas, eliminadoNaRodada: null });
  }
  s.fase = 'lobby';
  s.rodada = null;
  s.evento = null;
  s.vencedorId = null;
  s.ordem = [];
  passarHost(s);
  s.atualizadaEm = ctx.agora;
  return OK;
}

export function proximoAlarme(s: EstadoSala): number | null {
  if (s.fase === 'jogando') return s.prazo;
  if (s.fase === 'contagem' || s.fase === 'intervalo') return s.proximaEm;
  return null;
}

export function aplicarRaridades(s: EstadoSala, perguntaId: string, raridades: Record<string, Raridade>): boolean {
  if (s.rodada?.perguntaId !== perguntaId) return false;
  s.rodada.raridades = raridades;
  return true;
}

export function publico(s: EstadoSala, ctx: Pick<Ctx, 'agora' | 'banco'>): SalaPublica {
  const r = s.rodada;
  const pergunta = r ? ctx.banco.pergunta(r.perguntaId) : undefined;
  return {
    codigo: s.codigo,
    fase: s.fase,
    config: s.config,
    jogadores: s.jogadores.map(({ segredoHash: _, ...j }) => ({ ...j, host: j.id === s.hostId })),
    ordem: s.ordem,
    rodada:
      r && pergunta
        ? {
            numero: r.numero,
            perguntaId: r.perguntaId,
            texto: pergunta.texto,
            tema: pergunta.tema,
            temaNome: ctx.banco.nomeTema(pergunta.tema),
            nota: pergunta.nota,
            vezDe: r.vezDe,
            usadas: r.usadas.map(({ id: _, ...u }) => u),
            total: pergunta.respostas.length,
          }
        : null,
    evento: s.evento,
    proximaEmMs: s.proximaEm !== null ? Math.max(0, s.proximaEm - ctx.agora) : null,
    vencedorId: s.vencedorId,
  };
}
