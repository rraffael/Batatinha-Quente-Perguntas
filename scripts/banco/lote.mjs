// Cria e acompanha um lote de incremento do banco (docs/banco/PROCESSO.md).
//
//   node scripts/banco/lote.mjs novo <nome> <tema1> [tema2 ...]   cria trabalho-banco/<nome>/
//   node scripts/banco/lote.mjs estado <nome>                     mostra as etapas e os arquivos do lote

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIR_TRABALHO, PAPEIS, dirLote, temas } from "./lib.mjs";

const PASTAS = ["plano", "plano-aprovado", "pistas", ...PAPEIS.map((p) => `propostas/${p}`), "consolidado", "auditado", "dedup", "final"];

function novo(nome, ...lista) {
  if (!nome || !/^[a-z0-9-]+$/.test(nome)) throw new Error("nome do lote: letras minúsculas, números e hífen (ex.: lote-1)");
  const existentes = temas();
  const desconhecidos = lista.filter((t) => !existentes.includes(t));
  if (!lista.length || desconhecidos.length) throw new Error(`temas inválidos: ${desconhecidos.join(", ") || "(nenhum)"}; existem: ${existentes.join(", ")}`);
  const d = join(DIR_TRABALHO, nome);
  if (existsSync(d)) throw new Error(`o lote ${nome} já existe`);
  for (const p of PASTAS) mkdirSync(join(d, p), { recursive: true });
  writeFileSync(join(d, "ESTADO.md"), modeloEstado(nome, lista), "utf8");
  console.log(`lote criado: trabalho-banco/${nome}/ (temas: ${lista.join(", ")})`);
}

function modeloEstado(nome, lista) {
  return `# Lote ${nome}

Temas: ${lista.join(", ")}
Criado em: ${new Date().toISOString().slice(0, 10)}

Marque cada etapa ao concluir. Para retomar, continue da primeira desmarcada (detalhes em docs/banco/PROCESSO.md).

- [ ] 1. Planejador: perguntas novas em \`plano/<tema>.txt\`
- [ ] 2. Checagem do plano: \`node scripts/banco/dedup.mjs ${nome} plano\` + deduplicador → \`plano-aprovado/<tema>.txt\` + seção "Plano" de \`dedup/parecer.md\`
- [ ] 3. (Se houver exportação do banco de estatísticas) pistas: \`node scripts/banco/pistas.mjs ${nome} trabalho-banco/recusadas.json\`
- [ ] 4. Pesquisa → \`propostas/<papel>/<tema>.txt\`, cada bloco terminando com \`# fim\`
      (perguntas novas: generica + profunda + listas; perguntas existentes: listas + revisor)
- [ ] 5. Consolidar: \`node scripts/banco/consolidar.mjs ${nome}\` até \`consolidado/problemas.txt\` ficar vazio
- [ ] 6. Auditor → \`auditado/<tema>.txt\` + \`auditado/resumo.txt\` (lê também \`consolidado/avisos.txt\`)
- [ ] 7. Deduplicação final: \`node scripts/banco/dedup.mjs ${nome} final\` + deduplicador → \`final/<tema>.txt\` + seção "Final" do parecer
- [ ] 8. Conferência: \`node scripts/banco/dedup.mjs ${nome} conferir\` e \`node scripts/banco/aplicar.mjs ${nome} --simular\` (zero erros)
- [ ] 9. Amostra para o Raffael: \`node scripts/banco/amostra.mjs ${nome}\` → \`amostra.md\` (ele pode dispensar)
- [ ] 10. Aplicar: \`node scripts/banco/aplicar.mjs ${nome}\` (trava se o banco mudou, se já foi aplicado ou se a conferência falhar)
- [ ] 11. Validações: \`npm run check\`, \`npm test\`, \`npm run build\`
- [ ] 12. Atualizar ROADMAP.md e relatar decisões pendentes ao Raffael

## Decisões pendentes para o Raffael

## Notas
`;
}

function estado(nome) {
  const d = dirLote(nome);
  console.log(readFileSync(join(d, "ESTADO.md"), "utf8"));
  console.log("Arquivos:");
  for (const p of PASTAS) {
    const arqs = existsSync(join(d, p)) ? readdirSync(join(d, p)).filter((f) => f.endsWith(".txt") || f.endsWith(".md")) : [];
    console.log(`  ${p}/: ${arqs.length ? arqs.join(", ") : "—"}`);
  }
}

const [cmd, ...args] = process.argv.slice(2);
const comandos = { novo, estado };
if (!comandos[cmd]) {
  console.log("uso: node scripts/banco/lote.mjs <novo <nome> <temas...> | estado <nome>>");
  process.exit(1);
}
try { comandos[cmd](...args); } catch (e) { console.error(`erro: ${e.message}`); process.exit(1); }
