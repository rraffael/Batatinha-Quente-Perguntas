// Pistas dos jogadores: o que foi digitado, recusado e repetido por mais de uma pessoa vira lista de
// candidatos para os pesquisadores (resposta faltando ou variante que ninguém previu).
//
//   node scripts/banco/pistas.mjs <lote> <recusadas.json> [--min 2]
//
// O Raffael exporta o JSON do banco de estatísticas (D1) com:
//   npx wrangler d1 execute batatinha-stats --remote --json --command "SELECT pergunta_id, texto, vezes FROM tentativas_recusadas WHERE vezes >= 2 ORDER BY vezes DESC" > trabalho-banco/recusadas.json
// Saída: trabalho-banco/<lote>/pistas/<tema>.txt, só dos temas do lote. São pistas, não fontes:
// cada uma só entra no banco se um pesquisador achar fonte e o auditor aprovar.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dirLote, lerBancoFontes, normalizar } from "./lib.mjs";

const [lote, arquivo] = process.argv.slice(2);
const args = process.argv.slice(2);
const min = Number(args[args.indexOf("--min") + 1]) || 2;
const d = dirLote(lote);
if (!arquivo) throw new Error("informe o JSON exportado (veja o comentário no topo do script)");

const bruto = JSON.parse(readFileSync(arquivo, "utf8").replace(/^﻿/, ""));
// O wrangler devolve [{ results: [...] }]; aceita também uma lista simples de linhas.
const linhas = Array.isArray(bruto) && bruto[0]?.results ? bruto.flatMap((x) => x.results) : bruto;
const temasLote = new Set((readFileSync(join(d, "ESTADO.md"), "utf8").match(/^Temas: (.*)$/m)?.[1] ?? "").split(",").map((t) => t.trim()));
const banco = lerBancoFontes();

const porTema = new Map();
let total = 0;
for (const { pergunta_id: id, texto, vezes } of linhas) {
  const q = banco.get(id);
  if (!q || !temasLote.has(q.tema) || vezes < min) continue;
  const n = normalizar(texto ?? "");
  if (n.length < 2 || q.dono.has(n)) continue; // já virou resposta ou variante desde a coleta
  const m = porTema.get(q.tema) ?? porTema.set(q.tema, new Map()).get(q.tema);
  (m.get(id) ?? m.set(id, []).get(id)).push(`${texto} (${vezes}x)`);
  total++;
}
mkdirSync(join(d, "pistas"), { recursive: true });
for (const [tema, m] of porTema) {
  const out = [`# Pistas dos jogadores — tentativas recusadas ${min}x ou mais. Não são fontes: pesquise antes de propor.`];
  for (const [id, lst] of m) out.push("", `== ${id}    # ${banco.get(id).texto}`, ...lst);
  writeFileSync(join(d, "pistas", `${tema}.txt`), out.join("\n") + "\n", "utf8");
}
console.log(`pistas (${lote}): ${total} tentativas em ${porTema.size} temas → trabalho-banco/${lote}/pistas/`);
