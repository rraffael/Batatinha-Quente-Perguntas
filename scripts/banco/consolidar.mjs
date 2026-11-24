// Etapa 4: junta as propostas dos pesquisadores e do revisor num arquivo por tema, contra o banco atual.
//
//   node scripts/banco/consolidar.mjs <lote>
//
// Entrada: trabalho-banco/<lote>/plano-aprovado/<tema>.txt (perguntas novas aprovadas)
//          trabalho-banco/<lote>/propostas/<papel>/<tema>.txt (cada bloco termina com "# fim")
// Saída:   consolidado/<tema>.txt, consolidado/problemas.txt (bloqueiam a auditoria),
//          consolidado/avisos.txt (o auditor precisa olhar) e BASE (impressão digital do banco)
//
// O que faz sozinho (sem julgamento): descarta o que já existe no banco, converte "+" de algo que já
// existe em "~" (com aviso), junta propostas com a mesma canônica e aponta colisões e conflitos.

import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  DIR_FONTES, MIN_RESPOSTAS, NIVEIS, PAPEIS, TEMAS_OBRAS, cabecalhoNova, dirLote, formatarOp, hashFontes, lerBancoFontes,
  lerFonte, lerPropostas, normalizar, prefixosDoTema, semNumeral, temas,
} from "./lib.mjs";

const lote = process.argv[2];
const d = dirLote(lote);
const saida = join(d, "consolidado");
// Recomeça do zero: arquivo de tema que ficou sem proposta não pode sobrar de uma rodada anterior.
if (existsSync(saida)) for (const f of readdirSync(saida)) rmSync(join(saida, f), { force: true });
mkdirSync(saida, { recursive: true });
const problemas = [];
const avisos = [];
const totais = { mais: 0, til: 0, outras: 0, novas: 0 };
const idsGlobais = new Set(lerBancoFontes().keys());
const idsNovosLote = new Map();

for (const tema of temas()) {
  const banco = lerFonte(join(DIR_FONTES, `${tema}.txt`));
  const obras = TEMAS_OBRAS.has(tema);
  const novas = new Map();
  const arqPlano = join(d, "plano-aprovado", `${tema}.txt`);
  if (existsSync(arqPlano)) {
    const prefixos = prefixosDoTema(tema);
    for (const b of lerPropostas(arqPlano, (m) => problemas.push(m))) {
      if (!b.nova) { problemas.push(`${b.onde}: no plano só entram perguntas "== NOVA"`); continue; }
      if (idsGlobais.has(b.id)) { problemas.push(`${b.onde}: id "${b.id}" já existe no banco`); continue; }
      if (idsNovosLote.has(b.id)) { problemas.push(`${b.onde}: id "${b.id}" repetido no lote (também em ${idsNovosLote.get(b.id)})`); continue; }
      if (!prefixos.has(b.id.split("-")[0])) problemas.push(`${b.onde}: id "${b.id}" deve começar com um prefixo do tema (${[...prefixos].join(", ")})`);
      idsNovosLote.set(b.id, tema);
      novas.set(b.id, { ...b, respostas: [], dono: new Map() });
    }
  }

  // Por pergunta: propostas "+" (agrupadas por canônica), variantes "~" e operações do revisor.
  const porPergunta = new Map();
  const de = (id) => porPergunta.get(id) ?? porPergunta.set(id, { mais: [], til: new Map(), outras: [] }).get(id);

  for (const papel of PAPEIS) {
    const arq = join(d, "propostas", papel, `${tema}.txt`);
    if (!existsSync(arq)) continue;
    for (const b of lerPropostas(arq, (m) => problemas.push(m), { exigirFim: true })) {
      const q = banco.get(b.id) ?? novas.get(b.id);
      if (!q) { problemas.push(`${b.onde}: pergunta "${b.id}" não existe no tema ${tema} nem no plano aprovado`); continue; }
      const acc = de(b.id);
      for (const o of b.ops) {
        if (o.op === "+") adicionar(q, acc, o, papel, obras);
        else if (o.op === "~") variante(q, acc, o.canonica, o.aceitas, o.fontes, papel, o.onde);
        else {
          if (papel !== "revisor") { problemas.push(`${o.onde}: "${o.op}" só pode vir do revisor`); continue; }
          if (novas.has(b.id)) { problemas.push(`${o.onde}: "${o.op}" não se aplica a pergunta nova`); continue; }
          if (o.op !== "!" && !q.respostas.some((r) => r.canonica === o.canonica)) {
            problemas.push(`${o.onde}: resposta "${o.canonica}" não existe em ${b.id} (use a canônica exata)`); continue;
          }
          if (o.op === "x~") {
            const alheias = o.formas.filter((f) => q.dono.get(normalizar(f)) !== o.canonica);
            if (alheias.length) { problemas.push(`${o.onde}: formas que não são de "${o.canonica}": ${alheias.join(", ")}`); continue; }
          }
          if (o.op === "=") {
            const dono = q.dono.get(normalizar(o.nova));
            if (dono && dono !== o.canonica) { problemas.push(`${o.onde}: a nova canônica "${o.nova}" já é forma de "${dono}"`); continue; }
          }
          acc.outras.push({ ...o, comentario: papel + (o.comentario ? `: ${o.comentario}` : "") });
        }
      }
    }
  }

  const linhas = [];
  for (const id of [...banco.keys(), ...novas.keys()]) {
    const acc = porPergunta.get(id);
    const nova = novas.get(id);
    if (!acc && !nova) continue;
    const q = banco.get(id) ?? nova;
    conflitos(tema, id, acc);
    linhas.push(nova ? cabecalhoNova(nova) : `== ${id}    # ${q.texto}`);
    if (nova?.nota) linhas.push(`@nota ${nova.nota}`);
    if (nova?.atualizadoEm) linhas.push(`@atualizadoEm ${nova.atualizadoEm}`);
    const donoNovo = new Map();
    const mais = (acc?.mais ?? []).sort((a, b) => NIVEIS.indexOf(a.rar) - NIVEIS.indexOf(b.rar));
    for (const e of mais) {
      for (const n of e.normas) {
        if (donoNovo.has(n) && donoNovo.get(n) !== e.canonica) problemas.push(`${tema}/${id}: [FUSÃO?] a forma "${n}" aparece em "${e.canonica}" e "${donoNovo.get(n)}" — são a mesma coisa (junte) ou coisas diferentes (tire a forma de uma delas)?`);
        donoNovo.set(n, e.canonica);
      }
      linhas.push(formatarOp({ ...e, aceitas: e.aceitas.filter((x) => normalizar(x) !== normalizar(e.canonica)), fontes: [...e.fontes].join(" "), comentario: [...e.origens].join(",") }));
      totais.mais++;
    }
    for (const [alvo, e] of acc?.til ?? []) {
      const ac = [...e.aceitas.values()].filter((x) => {
        const dono = donoNovo.get(normalizar(x));
        if (dono) problemas.push(`${tema}/${id}: variante "${x}" de "${alvo}" colide com a nova "${dono}"`);
        return !dono;
      });
      if (!ac.length) continue;
      linhas.push(formatarOp({ op: "~", canonica: alvo, aceitas: ac, fontes: [...e.fontes].join(" "), comentario: [...e.origens].join(",") }));
      totais.til++;
    }
    for (const o of acc?.outras ?? []) { linhas.push(formatarOp(o)); totais.outras++; }
    if (nova) {
      totais.novas++;
      if (mais.length < MIN_RESPOSTAS) problemas.push(`${tema}/${id}: pergunta nova com só ${mais.length} respostas (mínimo ${MIN_RESPOSTAS})`);
    }
    linhas.push("");
  }
  if (linhas.length) writeFileSync(join(saida, `${tema}.txt`), linhas.join("\n"), "utf8");
}

// "+" de algo que já existe vira "~" (com aviso); só junta propostas com a mesma canônica.
function adicionar(q, acc, o, papel, obras) {
  const formas = [o.canonica, ...o.aceitas, ...o.en, ...o.es];
  const existentes = new Set(formas.map((f) => q.dono.get(normalizar(f))).filter(Boolean));
  if (existentes.size > 1) { problemas.push(`${o.onde}: formas de "${o.canonica}" batem em respostas diferentes (${[...existentes].join(", ")})`); return; }
  if (existentes.size === 1) {
    const alvo = [...existentes][0];
    const resto = formas.filter((f) => !q.dono.has(normalizar(f)));
    if (normalizar(o.canonica) !== normalizar(alvo) && !q.dono.has(normalizar(o.canonica))) {
      avisos.push(`${o.onde}: [CONVERTIDO] "+ ${o.canonica}" divide forma com "${alvo}" e virou variante dela — confira se não são entidades diferentes`);
    } else if (!resto.length) {
      avisos.push(`${o.onde}: [JÁ EXISTE] "+ ${o.canonica}" já está no banco como "${alvo}" (descartado)`);
    }
    acc.convertidos ??= new Set();
    acc.convertidos.add(alvo);
    if (resto.length) variante(q, acc, alvo, resto, o.fontes, papel, o.onde);
    return;
  }
  // Fora dos temas de obras, "Constantino III" com "Constantino" no banco é a mesma resposta (princípio 5).
  if (!obras) {
    const base = semNumeral(normalizar(o.canonica));
    const alvo = q.respostas.find((r) => semNumeral(normalizar(r.canonica)) === base || [r.canonica, ...r.aceitas].some((f) => semNumeral(normalizar(f)) === base));
    if (alvo && base !== normalizar(o.canonica)) {
      avisos.push(`${o.onde}: [NUMERAL] "+ ${o.canonica}" virou variante de "${alvo.canonica}" (nomes que só diferem pelo número são uma resposta só)`);
      variante(q, acc, alvo.canonica, formas, o.fontes, papel, o.onde);
      return;
    }
  }
  const chave = normalizar(o.canonica);
  let e = acc.mais.find((x) => normalizar(x.canonica) === chave);
  if (!e) {
    e = { op: "+", canonica: o.canonica, aceitas: [], en: [], es: [], rar: o.rar, fontes: new Set(), origens: new Set(), normas: new Set([chave]) };
    acc.mais.push(e);
  }
  const junta = (arr, novos) => { for (const x of novos) { const n = normalizar(x); if (!e.normas.has(n)) { e.normas.add(n); arr.push(x); } } };
  junta(e.aceitas, [o.canonica, ...o.aceitas]);
  junta(e.en, o.en);
  junta(e.es, o.es);
  if (NIVEIS.indexOf(o.rar) < NIVEIS.indexOf(e.rar)) e.rar = o.rar;
  for (const f of o.fontes.split(/\s+/)) e.fontes.add(f);
  e.origens.add(papel);
}

function variante(q, acc, canonica, formas, fontes, papel, onde) {
  const alvo = q.dono.get(normalizar(canonica)) ?? (q.respostas.some((r) => r.canonica === canonica) ? canonica : undefined);
  if (!alvo) { problemas.push(`${onde}: "~" para resposta inexistente "${canonica}"`); return; }
  const novas = formas.filter((f) => {
    const dono = q.dono.get(normalizar(f));
    if (dono && dono !== alvo) problemas.push(`${onde}: variante "${f}" de "${alvo}" já pertence a "${dono}"`);
    return !dono;
  });
  if (!novas.length) return;
  const e = acc.til.get(alvo) ?? acc.til.set(alvo, { aceitas: new Map(), fontes: new Set(), origens: new Set() }).get(alvo);
  for (const f of novas) if (!e.aceitas.has(normalizar(f))) e.aceitas.set(normalizar(f), f);
  for (const f of fontes.split(/\s+/)) e.fontes.add(f);
  e.origens.add(papel);
}

// Operações que se contradizem na mesma resposta (ex.: remover e ampliar; remover e um "+" que caiu nela).
function conflitos(tema, id, acc) {
  if (!acc) return;
  const porAlvo = new Map();
  const marca = (alvo, op) => (porAlvo.get(alvo) ?? porAlvo.set(alvo, new Set()).get(alvo)).add(op);
  for (const o of acc.outras) if (o.op !== "!") marca(o.canonica, o.op);
  for (const alvo of acc.til.keys()) marca(alvo, "~");
  for (const alvo of acc.convertidos ?? []) marca(alvo, "+→existente");
  for (const [alvo, ops] of porAlvo) {
    if (ops.has("x") && ops.size > 1) problemas.push(`${tema}/${id}: "${alvo}" tem remoção (x) e também ${[...ops].filter((o) => o !== "x").join(", ")} no mesmo lote — para trocar a canônica use "=", não "x" + "+"`);
  }
  if (acc.outras.filter((o) => o.op === "=").length !== new Set(acc.outras.filter((o) => o.op === "=").map((o) => o.canonica)).size) {
    problemas.push(`${tema}/${id}: duas trocas de canônica (=) para a mesma resposta`);
  }
}

writeFileSync(join(saida, "problemas.txt"), problemas.join("\n") + (problemas.length ? "\n" : ""), "utf8");
writeFileSync(join(saida, "avisos.txt"), avisos.join("\n") + (avisos.length ? "\n" : ""), "utf8");
writeFileSync(join(d, "BASE"), `${hashFontes()}\n`, "utf8");
console.log(`consolidado (${lote}): ${totais.novas} perguntas novas, ${totais.mais} respostas novas, ${totais.til} variantes, ${totais.outras} correções do revisor; ${problemas.length} problemas, ${avisos.length} avisos`);
if (problemas.length) console.log(`resolva antes da auditoria: trabalho-banco/${lote}/consolidado/problemas.txt`);
