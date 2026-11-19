import { DurableObject } from 'cloudflare:workers';
import type { SalaListada } from '../shared/protocolo';
import type { Env } from './env';

interface Registro extends SalaListada {
  em: number;
}

/** Sala que não dá notícia há esse tempo sai da lista (ex.: caiu sem avisar). */
const VALIDADE_MS = 20 * 60 * 1000;
const MAX_LISTA = 30;

/**
 * Saguão: uma única instância que guarda a lista de salas públicas.
 * As salas avisam quando o resumo muda; o início consulta a lista.
 */
export class Saguao extends DurableObject<Env> {
  private salas = new Map<string, Registro>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const salvo = await ctx.storage.get<Registro[]>('salas');
      for (const r of salvo ?? []) this.salas.set(r.codigo, r);
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const agora = Date.now();
    this.limpar(agora);

    if (url.pathname === '/atualizar' && req.method === 'POST') {
      const { codigo, resumo } = (await req.json()) as { codigo: string; resumo: SalaListada | null };
      if (resumo) this.salas.set(codigo, { ...resumo, em: agora });
      else this.salas.delete(codigo);
      await this.ctx.storage.put('salas', [...this.salas.values()]);
      return new Response('ok');
    }

    if (url.pathname === '/lista') {
      const lista = [...this.salas.values()]
        // Primeiro quem está no lobby (dá para jogar já), depois as mais movimentadas.
        .sort((a, b) => Number(b.fase === 'lobby') - Number(a.fase === 'lobby') || b.jogadores - a.jogadores)
        .slice(0, MAX_LISTA)
        .map(({ em: _, ...r }) => r);
      return Response.json(lista);
    }

    return new Response('Não encontrado', { status: 404 });
  }

  private limpar(agora: number): void {
    for (const [codigo, r] of this.salas) if (agora - r.em > VALIDADE_MS) this.salas.delete(codigo);
  }
}
