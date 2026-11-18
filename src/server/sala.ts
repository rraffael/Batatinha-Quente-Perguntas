import { DurableObject } from 'cloudflare:workers';
import type { Config, MsgCliente, MsgServidor } from '../shared/protocolo';
import { PING, PONG } from '../shared/protocolo';
import { temPalavrao } from '../shared/filtro';
import { MAX_RESPOSTA, raridadesPorUso } from '../shared/regras';
import { BANCO } from './banco-padrao';
import {
  aplicarRaridades,
  avancarTempo,
  configurar,
  criarSala,
  desconectar,
  entrar,
  expulsar,
  iniciar,
  novaPartida,
  novosEfeitos,
  proximoAlarme,
  publico,
  responder,
  sair,
  type Ctx,
  type EstadoSala,
  type Estatistica,
  type Resultado,
} from './jogo';
import type { Env } from './env';

interface Anexo {
  jogadorId?: string;
}

/** Sala sem ninguém conectado é apagada depois desse tempo. */
const LIMPEZA_MS = 60 * 60 * 1000;
const MAX_MENSAGEM = 2_000;

export class Sala extends DurableObject<Env> {
  private estado: EstadoSala | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
    ctx.blockConcurrencyWhile(async () => {
      this.estado = (await ctx.storage.get<EstadoSala>('estado')) ?? null;
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/criar') {
      if (this.estado) return new Response('existe', { status: 409 });
      const codigo = req.headers.get('x-codigo') ?? '????';
      this.estado = criarSala(codigo, Date.now());
      await this.salvar();
      await this.ctx.storage.setAlarm(Date.now() + LIMPEZA_MS);
      return new Response('ok');
    }

    if (url.pathname === '/info') {
      const s = this.estado;
      return Response.json({
        existe: !!s,
        fase: s?.fase ?? null,
        jogadores: s?.jogadores.length ?? 0,
      });
    }

    if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (!this.estado) return new Response('Sala não encontrada', { status: 404 });
      const par = new WebSocketPair();
      const [cliente, servidor] = Object.values(par);
      this.ctx.acceptWebSocket(servidor);
      servidor.serializeAttachment({} satisfies Anexo);
      return new Response(null, { status: 101, webSocket: cliente });
    }

    return new Response('Não encontrado', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, dados: string | ArrayBuffer): Promise<void> {
    const s = this.estado;
    if (!s || typeof dados !== 'string' || dados.length > MAX_MENSAGEM) return;
    let msg: MsgCliente;
    try {
      msg = JSON.parse(dados) as MsgCliente;
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;

    const anexo = (ws.deserializeAttachment() as Anexo | null) ?? {};
    const ctx = this.novoCtx();

    if (msg.t === 'entrar') {
      if (!texto(msg.jogadorId, 64) || !texto(msg.segredo, 128)) return;
      const segredoHash = await sha256(msg.segredo);
      const r = entrar(s, ctx, {
        jogadorId: msg.jogadorId,
        segredoHash,
        apelido: String(msg.apelido ?? ''),
        personagem: String(msg.personagem ?? ''),
      });
      if (!r.ok) {
        this.enviar(ws, { t: 'erro', codigo: r.codigo, mensagem: r.mensagem });
        ws.close(4000, r.codigo);
        return;
      }
      // Uma conexão por jogador: a mais nova substitui a antiga.
      for (const outro of this.ctx.getWebSockets()) {
        if (outro !== ws && (outro.deserializeAttachment() as Anexo | null)?.jogadorId === msg.jogadorId) {
          outro.serializeAttachment({} satisfies Anexo);
          try {
            outro.close(4001, 'substituida');
          } catch {}
        }
      }
      ws.serializeAttachment({ jogadorId: msg.jogadorId } satisfies Anexo);
      await this.concluir(ctx);
      return;
    }

    const id = anexo.jogadorId;
    if (!id) return;

    let r: Resultado | undefined;
    switch (msg.t) {
      case 'responder':
        if (typeof msg.texto !== 'string') return;
        responder(s, ctx, id, msg.texto);
        break;
      case 'digitando': {
        if (typeof msg.texto !== 'string' || s.fase !== 'jogando' || s.rodada?.vezDe !== id) return;
        const previa = msg.texto.slice(0, MAX_RESPOSTA);
        this.transmitir({ t: 'digitando', jogadorId: id, texto: temPalavrao(previa) ? '***' : previa }, id);
        return;
      }
      case 'config':
        r = configurar(s, ctx, id, (msg.config ?? {}) as Partial<Config>);
        break;
      case 'iniciar':
        r = iniciar(s, ctx, id);
        break;
      case 'novaPartida':
        r = novaPartida(s, ctx, id);
        break;
      case 'expulsar':
        if (typeof msg.jogadorId !== 'string') return;
        r = expulsar(s, ctx, id, msg.jogadorId);
        break;
      case 'sair':
        sair(s, ctx, id);
        ws.serializeAttachment({} satisfies Anexo);
        break;
      default:
        return;
    }
    if (r && !r.ok) this.enviar(ws, { t: 'erro', codigo: r.codigo, mensagem: r.mensagem });
    await this.concluir(ctx);
  }

  async webSocketClose(ws: WebSocket, codigo: number): Promise<void> {
    await this.aoFechar(ws);
    try {
      ws.close(codigo === 1005 || codigo === 1006 ? 1000 : codigo, 'tchau');
    } catch {}
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.aoFechar(ws);
  }

  async alarm(): Promise<void> {
    const s = this.estado;
    if (!s) return;
    const ctx = this.novoCtx();
    const devido = proximoAlarme(s);
    if (devido !== null) {
      avancarTempo(s, ctx);
      await this.concluir(ctx);
      return;
    }
    if (this.ctx.getWebSockets().length === 0 && ctx.agora - s.atualizadaEm >= LIMPEZA_MS - 1000) {
      this.estado = null;
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.agendar();
  }

  // ------------------------------------------------------------ internos

  private novoCtx(): Ctx {
    return { agora: Date.now(), rng: Math.random, banco: BANCO, efeitos: novosEfeitos() };
  }

  private async aoFechar(ws: WebSocket): Promise<void> {
    const s = this.estado;
    const id = (ws.deserializeAttachment() as Anexo | null)?.jogadorId;
    if (!s || !id) return;
    const aindaConectado = this.ctx
      .getWebSockets()
      .some((o) => o !== ws && (o.deserializeAttachment() as Anexo | null)?.jogadorId === id);
    if (aindaConectado) return;
    const ctx = this.novoCtx();
    desconectar(s, ctx, id);
    await this.concluir(ctx);
  }

  /** Persiste, reagenda o alarme, avisa todo mundo e dispara efeitos colaterais. */
  private async concluir(ctx: Ctx): Promise<void> {
    const s = this.estado;
    if (!s) return;
    await this.salvar();
    await this.agendar();

    for (const id of ctx.efeitos.expulsos) {
      for (const ws of this.socketsDe(id)) {
        this.enviar(ws, { t: 'erro', codigo: 'banido', mensagem: 'Você foi removido desta sala.' });
        ws.serializeAttachment({} satisfies Anexo);
        try {
          ws.close(4002, 'expulso');
        } catch {}
      }
    }
    for (const t of ctx.efeitos.tentativas) {
      const texto = temPalavrao(t.texto) ? '***' : t.texto;
      this.transmitir({ t: 'tentativa', jogadorId: t.jogadorId, texto, aceita: t.aceita });
    }
    this.transmitir({ t: 'sala', sala: publico(s, ctx) });
    for (const { jogadorId, msg } of ctx.efeitos.privadas) {
      for (const ws of this.socketsDe(jogadorId)) this.enviar(ws, msg);
    }
    if (ctx.efeitos.estatisticas.length > 0) this.ctx.waitUntil(this.gravarEstatisticas(ctx.efeitos.estatisticas));
    if (ctx.efeitos.carregarRaridade) this.ctx.waitUntil(this.carregarRaridade(ctx.efeitos.carregarRaridade));
  }

  private async salvar(): Promise<void> {
    if (this.estado) await this.ctx.storage.put('estado', this.estado);
  }

  private async agendar(): Promise<void> {
    const s = this.estado;
    if (!s) return;
    const agora = Date.now();
    const limpeza =
      this.ctx.getWebSockets().length > 0 ? agora + LIMPEZA_MS : Math.max(s.atualizadaEm + LIMPEZA_MS, agora + 1000);
    await this.ctx.storage.setAlarm(proximoAlarme(s) ?? limpeza);
  }

  private socketsDe(jogadorId: string): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => (ws.deserializeAttachment() as Anexo | null)?.jogadorId === jogadorId);
  }

  private enviar(ws: WebSocket, msg: MsgServidor): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {}
  }

  private transmitir(msg: MsgServidor, excetoJogador?: string): void {
    const texto = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const anexo = ws.deserializeAttachment() as Anexo | null;
      if (!anexo?.jogadorId || anexo.jogadorId === excetoJogador) continue;
      try {
        ws.send(texto);
      } catch {}
    }
  }

  private async gravarEstatisticas(lista: Estatistica[]): Promise<void> {
    const db = this.env.DB;
    if (!db) return;
    const agora = Date.now();
    const usar = db.prepare(
      'INSERT INTO uso_respostas (pergunta_id, resposta_id, usos) VALUES (?1, ?2, 1) ' +
        'ON CONFLICT (pergunta_id, resposta_id) DO UPDATE SET usos = usos + 1',
    );
    const recusar = db.prepare(
      'INSERT INTO tentativas_recusadas (pergunta_id, texto, vezes, ultima_em) VALUES (?1, ?2, 1, ?3) ' +
        'ON CONFLICT (pergunta_id, texto) DO UPDATE SET vezes = vezes + 1, ultima_em = ?3',
    );
    const comandos = lista.flatMap((e) => [
      ...e.usados.map((r) => usar.bind(e.perguntaId, r)),
      ...e.recusadas.map((t) => recusar.bind(e.perguntaId, t, agora)),
    ]);
    if (comandos.length === 0) return;
    try {
      await db.batch(comandos);
    } catch (erro) {
      console.error('Falha ao gravar estatísticas', erro);
    }
  }

  private async carregarRaridade(perguntaId: string): Promise<void> {
    const db = this.env.DB;
    const pergunta = BANCO.pergunta(perguntaId);
    if (!db || !pergunta) return;
    try {
      const { results } = await db
        .prepare('SELECT resposta_id, usos FROM uso_respostas WHERE pergunta_id = ?1')
        .bind(perguntaId)
        .all<{ resposta_id: string; usos: number }>();
      const usos = new Map(results.map((l) => [l.resposta_id, l.usos]));
      const raridades = raridadesPorUso(
        pergunta.respostas.map((r) => r.id),
        usos,
      );
      if (raridades && this.estado && aplicarRaridades(this.estado, perguntaId, raridades)) await this.salvar();
    } catch (erro) {
      console.error('Falha ao carregar raridades', erro);
    }
  }
}

function texto(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

async function sha256(valor: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(valor));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
