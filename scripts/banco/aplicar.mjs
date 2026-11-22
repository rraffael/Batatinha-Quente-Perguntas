// Etapas 7 e 8: simula e aplica o que foi aprovado em trabalho-banco/<lote>/final/ nas fontes do banco.
//
//   node scripts/banco/aplicar.mjs <lote> --simular   aplica numa cópia, gera e valida; não toca no banco
//   node scripts/banco/aplicar.mjs <lote>             confere o lote, simula, faz backup, aplica, gera os JSON,
//                                                     valida, registra as fontes e faz um backup "depois"
//
// Operações: "== NOVA" cria a pergunta no fim do arquivo do tema; "+" resposta nova; "~" variantes;
// "x" remove resposta; "x~" remove variantes; "=" troca a canônica (a antiga vira variante);
// "!" troca texto ou nota. Linhas "-" e blocos "--" são ignorados.
// As fontes (URLs) não vão para o banco do jogo: ficam em docs/banco/fontes-respostas/<tema>.tsv (versionado).
//
// Travas da aplicação de verdade: o lote não pode ter sido aplicado antes (arquivo APLICADO), o banco não
// pode ter mudado desde a consolidação (arquivo BASE) e "dedup.mjs <lote> conferir" precisa passar.

import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { DIR_FONTES, RAIZ, dirLote, formatarResposta, hashFontes, lerLinhaResposta, lerPropostas, normalizar, temasNaPasta } from "./lib.mjs";

const lote = process.argv[2];
const simular = process.argv.includes("--simular");
const d = dirLote(lote);
const dirFinal = join(d, "final");
const erros = [];
const contagem = { perguntas: 0, mais: 0, til: 0, x: 0, xtil: 0, troca: 0, canon: 0 };
const idsNovos = new Set();
const registro = []; // linhas para docs/banco/fontes-respostas/<tema>.tsv

// Mesmo slug do gerador (scripts/gerar-perguntas.mjs), que não troca "&" por "e".
const slug = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/ /g, "-");
const limpa = (s) => String(s ?? "").replace(/[\t\r\n]+/g, " ");

function rodar(base, args) {
  const r = spawnSync(process.execPath, args, { cwd: base, encoding: "utf8" });
  return { ok: r.status === 0, saida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function aplicarTema(tema, texto, blocos) {
  const eol = texto.includes("\r\n") ? "\r\n" : "\n";
  const L = texto.replace(/^﻿/, "").split(/\r?\n/);
  const inicio = (id) => L.findIndex((l) => l.startsWith("==") && l.slice(2).split("|")[0].trim() === id);
  // Fim do bloco da pergunta: antes da próxima "==", sem contar linhas vazias e comentários soltos no fim.
  const fim = (i) => {
    let j = i + 1;
    while (j < L.length && !L[j].startsWith("==")) j++;
    while (j > i + 1 && (!L[j - 1].trim() || L[j - 1].trim().startsWith("#"))) j--;
    return j;
  };
  const linhaDe = (i, canonica) => {
    for (let j = i + 1; j < fim(i); j++) {
      const l = L[j].trim();
      if (l && !l.startsWith("@") && !l.startsWith("#") && lerLinhaResposta(l).canonica === canonica) return j;
    }
    return -1;
  };
  const anota = (pergunta, o, detalhe, fontes = o.fontes ?? "") =>
    registro.push({ tema, linha: [new Date().toISOString().slice(0, 10), lote, pergunta, o.op, o.canonica ?? o.campo, detalhe, fontes].map(limpa).join("\t") });

  for (const b of blocos) {
    if (b.nova) {
      if (inicio(b.id) >= 0) { erros.push(`${tema}/${b.id}: pergunta nova já existe na fonte (lote aplicado antes?)`); continue; }
      while (L.length && !L[L.length - 1].trim()) L.pop();
      L.push("", `== ${b.id} | ${b.texto} | ${b.dificuldade} | ${b.tags} | ${b.fonte}`);
      if (b.nota) L.push(`@nota ${b.nota}`);
      registro.push({ tema, linha: [new Date().toISOString().slice(0, 10), lote, b.id, "NOVA", b.texto, b.nota ?? "", b.fonte].map(limpa).join("\t") });
      for (const o of b.ops) {
        if (o.op !== "+") { erros.push(`${o.onde}: pergunta nova só aceita "+"`); continue; }
        L.push(formatarResposta(o));
        idsNovos.add(`${b.id}#${slug(o.canonica)}`);
        anota(b.id, o, [...o.aceitas, ...o.en, ...o.es].join(";"));
        contagem.mais++;
      }
      L.push("");
      contagem.perguntas++;
      continue;
    }
    const i = inicio(b.id);
    if (i < 0) { erros.push(`${tema}/${b.id}: pergunta não existe`); continue; }
    // Ordem: trocas de texto/nota, remoções, variantes, trocas de canônica e, por último, respostas novas.
    const ordem = { "!": 0, x: 1, "x~": 2, "~": 3, "=": 4, "+": 5 };
    for (const o of [...b.ops].sort((a, c) => ordem[a.op] - ordem[c.op])) {
      if (o.op === "!") {
        if (o.campo === "texto") { const p = L[i].split("|"); p[1] = ` ${o.valor} `; L[i] = p.join("|"); }
        else {
          const k = L.findIndex((l, j) => j > i && j < fim(i) && l.startsWith("@nota "));
          if (k >= 0) L[k] = `@nota ${o.valor}`; else L.splice(i + 1, 0, `@nota ${o.valor}`);
        }
        anota(b.id, o, `${o.valor} (${o.motivo})`);
        contagem.troca++;
      } else if (o.op === "+") {
        L.splice(fim(i), 0, formatarResposta(o));
        idsNovos.add(`${b.id}#${slug(o.canonica)}`);
        anota(b.id, o, [...o.aceitas, ...o.en, ...o.es].join(";"));
        contagem.mais++;
      } else {
        const k = linhaDe(i, o.canonica);
        if (k < 0) { erros.push(`${o.onde}: resposta "${o.canonica}" não encontrada em ${b.id} (lote velho ou removida no mesmo lote?)`); continue; }
        if (o.op === "x") { L.splice(k, 1); anota(b.id, o, o.motivo); contagem.x++; continue; }
        const r = lerLinhaResposta(L[k].trim());
        if (o.op === "~") {
          const vistos = new Set([r.canonica, ...r.aceitas].map(normalizar));
          for (const f of o.aceitas) if (!vistos.has(normalizar(f))) { vistos.add(normalizar(f)); r.aceitas.push(f); }
          anota(b.id, o, o.aceitas.join(";"));
          contagem.til++;
        } else if (o.op === "=") {
          // A canônica antiga vira variante; a nova sai das variantes, se estava lá.
          r.aceitas = [r.canonica, ...r.aceitas.filter((f) => normalizar(f) !== normalizar(o.nova))];
          r.canonica = o.nova;
          anota(b.id, o, `→ ${o.nova} (${o.motivo})`);
          idsNovos.add(`${b.id}#${slug(o.nova)}`);
          contagem.canon++;
        } else {
          const tirar = new Set(o.formas.map(normalizar));
          const antes = r.aceitas.length + r.en.length + r.es.length;
          for (const campo of ["aceitas", "en", "es"]) r[campo] = r[campo].filter((f) => !tirar.has(normalizar(f)));
          if (antes - (r.aceitas.length + r.en.length + r.es.length) !== tirar.size) erros.push(`${o.onde}: nem todas as formas de "${o.canonica}" foram encontradas: ${o.formas.join(", ")}`);
          anota(b.id, o, `${o.formas.join(";")} (${o.motivo})`);
          contagem.xtil++;
        }
        L[k] = formatarResposta(r);
      }
    }
  }
  return L.join(eol);
}

// 0. Travas.
if (existsSync(join(d, "APLICADO"))) { console.error(`o lote ${lote} já foi aplicado (${readFileSync(join(d, "APLICADO"), "utf8").trim()})`); process.exit(1); }
const base = existsSync(join(d, "BASE")) ? readFileSync(join(d, "BASE"), "utf8").trim() : "";
const avisoBase = base !== hashFontes()
  ? "o banco mudou desde a consolidação deste lote (outro lote aplicado ou edição manual): rode consolidar de novo e refaça auditoria e deduplicação do que mudou"
  : "";
const conf = rodar(RAIZ, [join(RAIZ, "scripts", "banco", "dedup.mjs"), lote, "conferir"]);
if (!simular && (avisoBase || !conf.ok)) {
  if (avisoBase) console.error(`TRAVA ${avisoBase}`);
  if (!conf.ok) console.error(`TRAVA a conferência do lote falhou:\n${conf.saida.trim()}`);
  process.exit(1);
}

// 1. Lê o final/ e calcula as fontes novas em memória.
const temasFinal = temasNaPasta(dirFinal);
if (!temasFinal.length) { console.error(`nada para aplicar em trabalho-banco/${lote}/final/`); process.exit(1); }
const novasFontes = new Map();
for (const tema of temasFinal) {
  const blocos = lerPropostas(join(dirFinal, `${tema}.txt`), (m) => erros.push(m));
  novasFontes.set(tema, aplicarTema(tema, readFileSync(join(DIR_FONTES, `${tema}.txt`), "utf8"), blocos));
}
if (erros.length) { console.error(erros.map((e) => `ERRO ${e}`).join("\n")); process.exit(1); }

// 2. Simulação numa cópia: mesmos scripts de geração e validação do projeto.
const sim = join(d, "simulacao");
rmSync(sim, { recursive: true, force: true });
mkdirSync(join(sim, "data", "perguntas"), { recursive: true });
cpSync(DIR_FONTES, join(sim, "scripts", "fontes"), { recursive: true });
for (const f of ["gerar-perguntas.mjs", "validar-perguntas.mjs", "prefixos-revisados.txt"]) cpSync(join(RAIZ, "scripts", f), join(sim, "scripts", f));
for (const [tema, texto] of novasFontes) writeFileSync(join(sim, "scripts", "fontes", `${tema}.txt`), texto, "utf8");

const ger = rodar(sim, [join(sim, "scripts", "gerar-perguntas.mjs")]);
const val = ger.ok ? rodar(sim, [join(sim, "scripts", "validar-perguntas.mjs")]) : { ok: false, saida: "" };
// Pares parecidos (distância de edição pequena) só interessam quando envolvem uma resposta nova.
const linhasVal = val.saida.split(/\r?\n/);
const similaresNovos = linhasVal.filter((l) => l.startsWith("SIMILAR") && [...idsNovos].some((k) => {
  const [pergunta, resp] = k.split("#");
  return l.includes(`#${pergunta}:`) && l.includes(`(${resp})`);
}));
const resumo = `${contagem.perguntas} perguntas novas, ${contagem.mais} respostas novas, ${contagem.til} variantes, ${contagem.x} remoções, ${contagem.xtil} variantes removidas, ${contagem.canon} trocas de canônica, ${contagem.troca} trocas de texto/nota`;
const relatorio = [
  `# Simulação do lote ${lote}`, resumo, "",
  "## Travas da aplicação",
  avisoBase ? `- BASE: ${avisoBase}` : "- BASE: ok (banco igual ao da consolidação)",
  conf.ok ? "- Conferência (dedup conferir): ok" : `- Conferência (dedup conferir): FALHOU\n${conf.saida.trim()}`,
  "", "## Geração", ger.saida.trim(), "", "## Validação", linhasVal.filter((l) => !l.startsWith("SIMILAR")).join("\n").trim(), "",
  "## Pares parecidos envolvendo respostas novas (revisar: podem ser a mesma coisa ou confundir o jogador)",
  ...(similaresNovos.length ? similaresNovos : ["nenhum"]), "",
].join("\n");
writeFileSync(join(sim, "relatorio.txt"), relatorio, "utf8");
console.log(`simulação: ${val.ok ? "OK" : "COM ERROS"} — ${resumo}; ${similaresNovos.length} pares parecidos novos`);
if (simular && (avisoBase || !conf.ok)) console.log("atenção: a aplicação de verdade está travada (veja \"Travas\" no relatório)");
console.log(`relatório: trabalho-banco/${lote}/simulacao/relatorio.txt`);
if (!val.ok) {
  console.error(linhasVal.filter((l) => l.startsWith("ERRO")).slice(0, 30).join("\n") || ger.saida);
  process.exit(1);
}
if (simular) process.exit(0);

// 3. Aplicação de verdade, entre dois backups.
const backup = (rotulo) => {
  const r = rodar(RAIZ, [join(RAIZ, "scripts", "banco", "backup.mjs"), "criar", rotulo]);
  process.stdout.write(r.saida);
  if (!r.ok) { console.error("o backup falhou; nada foi aplicado"); process.exit(1); }
  return (r.saida.match(/backups\/banco\/(\S+)/) ?? [])[1];
};
const antes = backup(`antes-de-aplicar-${lote}`);
for (const [tema, texto] of novasFontes) writeFileSync(join(DIR_FONTES, `${tema}.txt`), texto, "utf8");
const gerReal = rodar(RAIZ, [join(RAIZ, "scripts", "gerar-perguntas.mjs")]);
const valReal = gerReal.ok ? rodar(RAIZ, [join(RAIZ, "scripts", "validar-perguntas.mjs"), "--sem-similares"]) : gerReal;
if (!valReal.ok) {
  console.error(valReal.saida);
  console.error(`a validação falhou depois de aplicar; volte com: node scripts/banco/backup.mjs restaurar ${antes} --confirmar`);
  process.exit(1);
}
// Fontes de cada item aplicado, versionadas junto com o banco.
const dirReg = join(RAIZ, "docs", "banco", "fontes-respostas");
mkdirSync(dirReg, { recursive: true });
for (const tema of new Set(registro.map((r) => r.tema))) {
  const arq = join(dirReg, `${tema}.tsv`);
  if (!existsSync(arq)) writeFileSync(arq, "data\tlote\tpergunta\toperação\tresposta\tdetalhe\tfontes\n", "utf8");
  appendFileSync(arq, registro.filter((r) => r.tema === tema).map((r) => r.linha).join("\n") + "\n", "utf8");
}
const depois = backup(`depois-de-${lote}`);
if (depois) cpSync(dirFinal, join(RAIZ, "backups", "banco", depois, "lote-final"), { recursive: true });
writeFileSync(join(d, "APLICADO"), `${new Date().toISOString()} — backup antes: ${antes}; depois: ${depois}\n`, "utf8");
console.log("aplicado. Agora rode as validações do projeto: npm run check · npm test · npm run build");
