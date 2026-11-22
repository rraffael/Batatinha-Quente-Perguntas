// Perguntas e respostas por tema contra a meta de perguntas.
//
//   node scripts/banco/cobertura.mjs [--meta 15]

import { join } from "node:path";
import { DIR_FONTES, lerFonte, temas } from "./lib.mjs";

const args = process.argv.slice(2);
const meta = Number(args[args.indexOf("--meta") + 1]) || 15;
let totalP = 0, totalR = 0, faltam = 0;
console.log("tema | perguntas | respostas | faltam para a meta");
for (const t of temas()) {
  const perguntas = [...lerFonte(join(DIR_FONTES, `${t}.txt`)).values()];
  const respostas = perguntas.reduce((s, p) => s + p.respostas.length, 0);
  const f = Math.max(0, meta - perguntas.length);
  totalP += perguntas.length; totalR += respostas; faltam += f;
  console.log(`${t} | ${perguntas.length} | ${respostas} | ${f || "ok"}`);
}
console.log(`TOTAL | ${totalP} | ${totalR} | ${faltam} (meta: ${meta} por tema)`);
