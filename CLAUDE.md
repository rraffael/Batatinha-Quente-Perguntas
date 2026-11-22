# Batatá Quentá

Perfil: **Raffael (Projetos Pessoais)**

Jogo web multiplayer de perguntas estilo batata quente, em PT-BR, com tema de folclore brasileiro.
Endereço: batata.tiffion.com.

## Regras de ouro
1. Jogável com amigos em português (PC principal, celular junto).
2. Banco de perguntas extenso, 100% correto, com variantes parciais sensatas.

## Stack (custo zero)
- Cloudflare Workers + Durable Objects (1 sala = 1 DO, pavio via Alarm, WebSocket Hibernation) + D1 opcional.
- Preact + Vite + TypeScript, servido pelo mesmo Worker (`@cloudflare/vite-plugin`).
- Deploy: push no GitHub → Workers Builds (`npm run build` / `npx wrangler deploy`).

## Estrutura
- `data/perguntas/<tema>.json` — banco (gerado de `scripts/fontes/<tema>.txt` por `scripts/gerar-perguntas.mjs`; validar com `scripts/validar-perguntas.mjs`).
- `scripts/gerar-banco.mjs` — compila o banco para `src/server/generated/banco.json` (só servidor; nunca vai ao cliente).
- `src/shared/` — regras, protocolo, normalização, filtro de palavrões.
- `src/server/jogo.ts` — motor puro (testável); `sala.ts` — Durable Object; `casamento.ts` — reconhecimento de respostas.
- `src/client/` — telas Preact; `design/` — tokens, SVGs e protótipo.
- `docs/banco/PROCESSO.md` — processo de incremento do banco (lotes, agentes, backups em `backups/banco/`, scripts em `scripts/banco/`); progresso em `ROADMAP.md`.
- `docs/PASSO-A-PASSO.md` — o que o Raffael executa (contas, git, npm install, painéis).

## Validações
`npm run check` · `npm test` · `npm run build` · `node scripts/validar-perguntas.mjs`
