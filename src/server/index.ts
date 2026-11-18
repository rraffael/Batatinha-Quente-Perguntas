import { BANCO } from './banco-padrao';
import type { Env } from './env';

export { Sala } from './sala';

// Sem vogais: evita formar palavras (e palavrões) no código da sala.
const LETRAS = 'BCDFGHJKLMNPQRSTVWXZ';
const CODIGO = /^[BCDFGHJKLMNPQRSTVWXZ]{4}$/;

function gerarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map((b) => LETRAS[b % LETRAS.length]).join('');
}

function sala(env: Env, codigo: string) {
  return env.SALAS.get(env.SALAS.idFromName(codigo));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === '/api/temas' && req.method === 'GET') {
      return Response.json(BANCO.temas, { headers: { 'cache-control': 'public, max-age=300' } });
    }

    if (pathname === '/api/salas' && req.method === 'POST') {
      for (let tentativa = 0; tentativa < 8; tentativa++) {
        const codigo = gerarCodigo();
        const r = await sala(env, codigo).fetch('https://sala/criar', {
          method: 'POST',
          headers: { 'x-codigo': codigo },
        });
        if (r.ok) return Response.json({ codigo });
      }
      return Response.json({ erro: 'Não foi possível criar a sala agora.' }, { status: 503 });
    }

    const info = pathname.match(/^\/api\/salas\/([A-Za-z]{4})$/);
    if (info && req.method === 'GET') {
      const codigo = info[1].toUpperCase();
      if (!CODIGO.test(codigo)) return Response.json({ existe: false });
      return sala(env, codigo).fetch('https://sala/info');
    }

    const ws = pathname.match(/^\/ws\/([A-Za-z]{4})$/);
    if (ws) {
      const codigo = ws[1].toUpperCase();
      if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Esperava WebSocket', { status: 426 });
      }
      if (!CODIGO.test(codigo)) return new Response('Sala não encontrada', { status: 404 });
      return sala(env, codigo).fetch(req);
    }

    return new Response('Não encontrado', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
