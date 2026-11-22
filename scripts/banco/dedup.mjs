// Relatórios automáticos de duplicidade contra o banco atual (apoio ao agente deduplicador).
//
//   node scripts/banco/dedup.mjs <lote> plano      etapa 2: perguntas de plano/ contra o banco e entre si
//   node scripts/banco/dedup.mjs <lote> final      etapa 6: tudo de auditado/ contra o banco
//   node scripts/banco/dedup.mjs <lote> conferir   portão da etapa 7: final/ sem alertas que bloqueiam
//
// Saída: trabalho-banco/<lote>/dedup/relatorio-<etapa>.txt.
// Alertas que bloqueiam: [ID], [VAZAMENTO], [POUCAS], [DUPLICADA] (sempre) e [SOBREPOSIÇÃO]
// (a não ser que dedup/parecer.md tenha a linha "MANTIDO <chave>" com a justificativa).
// [ESCOPO], [FONTE], [REMOÇÃO] e [TROCA] são informativos: o deduplicador olha, mas não bloqueiam.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MIN_RESPOSTAS, dirLote, formasDe, lerBancoFontes, lerPropostas, normalizar, temasNaPasta } from "./lib.mjs";

const [lote, etapa] = process.argv.slice(2);
if (!["plano", "final", "conferir"].includes(etapa)) {
  console.log("uso: node scripts/banco/dedup.mjs <lote> <plano|final|conferir>");
  process.exit(1);
}
const d = dirLote(lote);
const banco = lerBancoFontes();
const alertas = [];
const problemas = [];
const BLOQUEIA = new Set(["ID", "VAZAMENTO", "POUCAS", "DUPLICADA", "SOBREPOSIÇÃO"]);
const alerta = (tag, chave, msg) => alertas.push({ tag, chave: `${tag}:${chave}`, msg: `[${tag}] ${msg}` });

// Etapas na ordem: cada pasta precisa ter os mesmos temas da anterior e ser mais nova que ela.
function conferirSequencia(anterior, atual) {
  const a = temasNaPasta(join(d, anterior));
  const b = temasNaPasta(join(d, atual));
  const faltam = a.filter((t) => !b.includes(t));
  const sobram = b.filter((t) => !a.includes(t));
  if (faltam.length) problemas.push(`${atual}/ não tem ${faltam.join(", ")} (que estão em ${anterior}/) — etapa incompleta`);
  if (sobram.length) problemas.push(`${atual}/ tem ${sobram.join(", ")} sem correspondente em ${anterior}/`);
  for (const t of b.filter((x) => a.includes(x))) {
    if (statSync(join(d, atual, `${t}.txt`)).mtimeMs < statSync(join(d, anterior, `${t}.txt`)).mtimeMs) {
      problemas.push(`${atual}/${t}.txt é mais antigo que ${anterior}/${t}.txt — refaça a etapa a partir da versão atual`);
    }
  }
}

const pasta = { plano: "plano", final: "auditado", conferir: "final" }[etapa];
if (etapa !== "plano") {
  const arqProb = join(d, "consolidado", "problemas.txt");
  if (existsSync(arqProb) && readFileSync(arqProb, "utf8").trim()) problemas.push("consolidado/problemas.txt não está vazio — resolva e consolide de novo antes de auditar");
}
if (etapa === "final") conferirSequencia("consolidado", "auditado");
if (etapa === "conferir") { conferirSequencia("consolidado", "auditado"); conferirSequencia("auditado", "final"); }

const VAZIAS = new Set("cite um uma uns umas de do da dos das e ou o a os as em no na nos nas com por para que seu sua ser".split(" "));
const palavras = (s) => new Set(normalizar(s ?? "").split(" ").filter((w) => w.length > 2 && !VAZIAS.has(w)));
function jaccard(a, b) {
  const A = palavras(a), B = palavras(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return A.size + B.size ? inter / (A.size + B.size - inter) : 0;
}
const semAncora = (u) => (u ?? "").split("#")[0].replace(/\/$/, "").toLowerCase();

const novas = [];
const ops = [];
for (const tema of temasNaPasta(join(d, pasta))) {
  for (const b of lerPropostas(join(d, pasta, `${tema}.txt`), (m) => problemas.push(m))) {
    if (b.nova) novas.push({ ...b, tema });
    else if (etapa === "plano") problemas.push(`${b.onde}: no plano só entram perguntas "== NOVA"`);
    for (const o of b.ops) ops.push({ ...o, tema, pergunta: b.id, nova: b.nova });
  }
}

// 1. Ids, escopo, fonte e vazamento das perguntas novas.
for (const [i, n] of novas.entries()) {
  if (banco.has(n.id)) alerta("ID", n.id, `${n.id}: já existe no banco (${banco.get(n.id).tema})`);
  for (const [id, p] of banco) {
    const j = jaccard(n.texto, p.texto);
    if (j >= 0.4) alerta("ESCOPO", `${n.id}:${id}`, `${n.id} "${n.texto}" parece ${id} "${p.texto}" (${Math.round(j * 100)}% das palavras)`);
    if (n.fonte && semAncora(n.fonte) === semAncora(p.fonte)) alerta("FONTE", `${n.id}:${id}`, `${n.id} usa a mesma lista-fonte de ${id}: ${n.fonte}`);
  }
  for (const m of novas.slice(i + 1)) {
    if (m.id === n.id) alerta("ID", n.id, `${n.id}: repetido no lote`);
    const j = jaccard(n.texto, m.texto);
    if (j >= 0.4) alerta("ESCOPO", `${n.id}:${m.id}`, `${n.id} parece ${m.id}, ambas novas (${Math.round(j * 100)}% das palavras)`);
  }
  if (!n.fonte || !/^https?:\/\//.test(n.fonte)) alerta("FONTE", n.id, `${n.id}: pergunta nova sem URL de lista-fonte`);
  const tela = ` ${normalizar([n.texto, n.nota].filter(Boolean).join(" "))} `;
  for (const o of n.ops.filter((x) => x.op === "+")) {
    const f = [o.canonica, ...o.aceitas, ...o.en, ...o.es].find((x) => { const k = normalizar(x); return k.length > 1 && tela.includes(` ${k} `); });
    if (f) alerta("VAZAMENTO", `${n.id}:${normalizar(f)}`, `${n.id}: o texto ou a nota revela a resposta "${f}"`);
  }
}

if (etapa !== "plano") {
  // 2. Sobreposição de respostas: pergunta nova que repete boa parte de uma existente é a mesma pergunta disfarçada.
  for (const n of novas) {
    const maisN = n.ops.filter((o) => o.op === "+");
    if (maisN.length < MIN_RESPOSTAS) alerta("POUCAS", n.id, `${n.id}: ${maisN.length} respostas aprovadas (mínimo ${MIN_RESPOSTAS})`);
    for (const outra of [...banco.values(), ...novas.filter((x) => x !== n)]) {
      const formasOutra = new Set(outra.respostas
        ? outra.respostas.flatMap((r) => formasDe(r).map(normalizar))
        : outra.ops.filter((o) => o.op === "+").flatMap((o) => [o.canonica, ...o.aceitas].map(normalizar)));
      const comuns = maisN.filter((o) => [o.canonica, ...o.aceitas].some((f) => formasOutra.has(normalizar(f))));
      const pct = maisN.length ? comuns.length / maisN.length : 0;
      if (pct >= 0.3 || comuns.length >= 15) {
        alerta("SOBREPOSIÇÃO", `${n.id}:${outra.id}`, `${n.id} repete ${comuns.length}/${maisN.length} (${Math.round(pct * 100)}%) respostas de ${outra.id}: ${comuns.slice(0, 10).map((o) => o.canonica).join(", ")}${comuns.length > 10 ? ", …" : ""}`);
      }
    }
  }

  // 3. Respostas e variantes contra a própria pergunta (o auditor pode ter mexido depois da consolidação).
  const porPergunta = new Map();
  for (const o of ops) (porPergunta.get(o.pergunta) ?? porPergunta.set(o.pergunta, []).get(o.pergunta)).push(o);
  for (const [id, lst] of porPergunta) {
    const q = banco.get(id);
    const dono = new Map();
    for (const r of q?.respostas ?? []) for (const f of formasDe(r)) dono.set(normalizar(f), r.canonica);
    const removidas = new Set(lst.filter((o) => o.op === "x").map((o) => o.canonica));
    for (const o of lst) {
      if (o.op === "+") {
        for (const f of [o.canonica, ...o.aceitas, ...o.en, ...o.es]) {
          const k = normalizar(f);
          const atual = dono.get(k);
          if (atual && !removidas.has(atual)) alerta("DUPLICADA", `${id}:${k}`, `${id}: "${f}" (nova "${o.canonica}") já é forma de "${atual}"`);
          else dono.set(k, `nova ${o.canonica}`);
        }
      } else if (o.op === "~") {
        for (const f of o.aceitas) {
          const k = normalizar(f);
          const atual = dono.get(k);
          if (atual && atual !== o.canonica) alerta("DUPLICADA", `${id}:${k}`, `${id}: variante "${f}" de "${o.canonica}" já é forma de "${atual}"`);
          else dono.set(k, o.canonica);
        }
      } else if (o.op === "x") alerta("REMOÇÃO", `${id}:${o.canonica}`, `${id}: remover "${o.canonica}" — ${o.motivo} (confirmar com a fonte)`);
      else if (o.op === "=") alerta("TROCA", `${id}:${o.canonica}`, `${id}: canônica "${o.canonica}" → "${o.nova}" — ${o.motivo}`);
    }
  }
}

mkdirSync(join(d, "dedup"), { recursive: true });
const parecer = existsSync(join(d, "dedup", "parecer.md")) ? readFileSync(join(d, "dedup", "parecer.md"), "utf8") : null;
const mantido = (a) => a.tag === "SOBREPOSIÇÃO" && parecer?.includes(`MANTIDO ${a.chave}`);
const bloqueios = alertas.filter((a) => BLOQUEIA.has(a.tag) && !mantido(a));
const relatorio = [
  `# Relatório automático de duplicidade — lote ${lote}, etapa ${etapa} (lido de ${pasta}/)`,
  `# ${novas.length} perguntas novas, ${ops.length} operações, ${alertas.length} alertas (${bloqueios.length} bloqueiam), ${problemas.length} problemas`,
  "# Para manter uma sobreposição de propósito, escreva em dedup/parecer.md: MANTIDO <chave> — justificativa",
  "",
  ...problemas.map((p) => `[PROBLEMA] ${p}`),
  ...alertas.map((a) => `${a.msg}${BLOQUEIA.has(a.tag) ? (mantido(a) ? "  (mantido no parecer)" : "  {bloqueia}") : ""}  <${a.chave}>`),
  "",
].join("\n");
writeFileSync(join(d, "dedup", `relatorio-${etapa}.txt`), relatorio, "utf8");
console.log(`dedup ${etapa} (${lote}): ${novas.length} perguntas novas, ${alertas.length} alertas (${bloqueios.length} bloqueiam), ${problemas.length} problemas → trabalho-banco/${lote}/dedup/relatorio-${etapa}.txt`);

if (etapa === "conferir") {
  if (!parecer) problemas.push("falta dedup/parecer.md");
  if (problemas.length || bloqueios.length) {
    for (const p of problemas) console.error(`PROBLEMA ${p}`);
    for (const a of bloqueios) console.error(`BLOQUEIA ${a.msg}  <${a.chave}>`);
    process.exit(1);
  }
}
