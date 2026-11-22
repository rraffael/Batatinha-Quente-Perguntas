// Amostra para conferência humana: sorteia itens aprovados em final/ para o Raffael conferir com a fonte.
// Mede se a auditoria por agentes está mesmo pegando os erros (todos os papéis rodam no mesmo modelo de IA).
//
//   node scripts/banco/amostra.mjs <lote> [--n 15]
//
// Saída: trabalho-banco/<lote>/amostra.md com caixinhas. O Raffael marca [x] certo ou escreve "ERRO: …".
// Erro encontrado na amostra = revisar o lote inteiro daquele tema antes de aplicar.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { dirLote, lerPropostas, temasNaPasta } from "./lib.mjs";

const [lote] = process.argv.slice(2);
const args = process.argv.slice(2);
const n = Number(args[args.indexOf("--n") + 1]) || 15;
const d = dirLote(lote);

const itens = [];
for (const tema of temasNaPasta(join(d, "final"))) {
  for (const b of lerPropostas(join(d, "final", `${tema}.txt`))) {
    if (b.nova) itens.push({ tema, txt: `Pergunta nova **${b.id}**: "${b.texto}"${b.nota ? ` — nota: "${b.nota}"` : ""} — lista-fonte: ${b.fonte}` });
    for (const o of b.ops) {
      const onde = `${tema}/${b.id}`;
      if (o.op === "+") itens.push({ tema, txt: `${onde}: **${o.canonica}** é resposta válida${o.aceitas.length ? ` (variantes: ${o.aceitas.join(", ")})` : ""} — ${o.fontes}` });
      else if (o.op === "~") itens.push({ tema, txt: `${onde}: "${o.aceitas.join(", ")}" são formas de **${o.canonica}** — ${o.fontes}` });
      else if (o.op === "x") itens.push({ tema, txt: `${onde}: remover **${o.canonica}** (${o.motivo}) — ${o.fontes}` });
      else if (o.op === "=") itens.push({ tema, txt: `${onde}: canônica **${o.canonica}** → **${o.nova}** (${o.motivo})` });
    }
  }
}
// Sorteio sem repetição (Fisher-Yates), garantindo ao menos um item por tema quando possível.
for (let i = itens.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [itens[i], itens[j]] = [itens[j], itens[i]]; }
const escolhidos = [];
for (const t of new Set(itens.map((x) => x.tema))) escolhidos.push(itens.find((x) => x.tema === t));
for (const x of itens) if (escolhidos.length < n && !escolhidos.includes(x)) escolhidos.push(x);

writeFileSync(join(d, "amostra.md"), [
  `# Amostra para conferência — lote ${lote}`,
  "",
  `${escolhidos.length} de ${itens.length} itens sorteados. Abra a fonte e marque [x] se estiver certo, ou escreva "ERRO: motivo".`,
  "",
  ...escolhidos.map((x) => `- [ ] ${x.txt}`),
  "",
].join("\n"), "utf8");
console.log(`amostra (${lote}): ${escolhidos.length} de ${itens.length} itens → trabalho-banco/${lote}/amostra.md`);
