// Backup versionado do banco de perguntas.
//
//   node scripts/banco/backup.mjs criar "<rótulo>"     copia o banco para backups/banco/<data>_<rótulo>/
//   node scripts/banco/backup.mjs listar               lista os backups (mais novo primeiro)
//   node scripts/banco/backup.mjs comparar <pasta>     perguntas e respostas que mudaram desde o backup
//   node scripts/banco/backup.mjs restaurar <pasta>    mostra o que vai mudar; com --confirmar, volta o banco ao
//                                                      backup (antes, faz um backup do estado atual) e regera os JSON
//
// <pasta> aceita o nome completo ou só o começo (ex.: 2026-11-22_1530), desde que seja único.
// O backup é gravado numa pasta .tmp e só ganha o nome final (com MANIFESTO.json) quando termina inteiro.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dirBackups = join(raiz, "backups", "banco");
// O que compõe o banco. data/perguntas é derivado das fontes, mas guardamos para restaurar sem regerar.
const ITENS = ["scripts/fontes", "data/perguntas", "scripts/prefixos-revisados.txt"];

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function carimbo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Lê data/perguntas/*.json de uma raiz (o banco atual ou um backup).
function lerBanco(base) {
  const dir = join(base, "data", "perguntas");
  const perguntas = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const tema = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const p of tema.perguntas) perguntas.set(p.id, { tema: tema.tema, ...p });
  }
  return perguntas;
}

function manifesto(base) {
  const perguntas = lerBanco(base);
  const porTema = {};
  let respostas = 0;
  for (const p of perguntas.values()) {
    porTema[p.tema] ??= { perguntas: 0, respostas: 0 };
    porTema[p.tema].perguntas++;
    porTema[p.tema].respostas += p.respostas.length;
    respostas += p.respostas.length;
  }
  const hash = createHash("sha256");
  const dirFontes = join(base, "scripts", "fontes");
  for (const f of readdirSync(dirFontes).sort()) hash.update(f).update(readFileSync(join(dirFontes, f)));
  return { perguntas: perguntas.size, respostas, porTema, hashFontes: hash.digest("hex").slice(0, 16) };
}

function criar(rotulo) {
  if (!rotulo) throw new Error('informe um rótulo: backup.mjs criar "antes-do-lote-1"');
  let nome = `${carimbo()}_${slug(rotulo)}`;
  for (let n = 2; existsSync(join(dirBackups, nome)); n++) nome = `${carimbo()}_${slug(rotulo)}-${n}`;
  const final = join(dirBackups, nome);
  const destino = `${final}.tmp`;
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  for (const item of ITENS) {
    const origem = join(raiz, item);
    if (existsSync(origem)) cpSync(origem, join(destino, item), { recursive: true });
  }
  const m = { rotulo, criadoEm: new Date().toISOString(), ...manifesto(destino) };
  writeFileSync(join(destino, "MANIFESTO.json"), JSON.stringify(m, null, 2) + "\n", "utf8");
  renameSync(destino, final);
  console.log(`backup criado: backups/banco/${nome} (${m.perguntas} perguntas, ${m.respostas} respostas)`);
  return nome;
}

function listar() {
  if (!existsSync(dirBackups)) return console.log("nenhum backup ainda");
  const nomes = readdirSync(dirBackups).filter((n) => !n.endsWith(".tmp")).sort().reverse();
  for (const n of nomes) {
    let m = {};
    try { m = JSON.parse(readFileSync(join(dirBackups, n, "MANIFESTO.json"), "utf8")); } catch { /* backup sem manifesto */ }
    console.log(`${n}  ${m.perguntas ?? "?"} perguntas, ${m.respostas ?? "?"} respostas  ${m.rotulo ?? ""}`);
  }
}

function resolver(pasta) {
  if (!pasta) throw new Error("informe a pasta do backup (veja backup.mjs listar)");
  const nomes = existsSync(dirBackups) ? readdirSync(dirBackups).filter((n) => n.startsWith(pasta) && !n.endsWith(".tmp")) : [];
  if (nomes.length !== 1) throw new Error(nomes.length ? `"${pasta}" é ambíguo: ${nomes.join(", ")}` : `backup "${pasta}" não encontrado`);
  const dir = join(dirBackups, nomes[0]);
  if (!existsSync(join(dir, "MANIFESTO.json"))) throw new Error(`backup ${nomes[0]} está incompleto (sem MANIFESTO.json)`);
  return dir;
}

function comparar(pasta) {
  console.log(`mudanças do backup ${pasta} para o banco atual (+ existe só no atual, - existe só no backup):`);
  const antes = lerBanco(resolver(pasta));
  const agora = lerBanco(raiz);
  const linhas = [];
  for (const [id, p] of agora) {
    const a = antes.get(id);
    if (!a) { linhas.push(`+ pergunta ${p.tema}#${id} (${p.respostas.length} respostas)`); continue; }
    const idsA = new Set(a.respostas.map((r) => r.id));
    const idsN = new Set(p.respostas.map((r) => r.id));
    const novas = p.respostas.filter((r) => !idsA.has(r.id)).map((r) => r.canonica);
    const saiu = a.respostas.filter((r) => !idsN.has(r.id)).map((r) => r.canonica);
    if (a.texto !== p.texto) linhas.push(`~ ${id}: texto "${a.texto}" → "${p.texto}"`);
    if ((a.nota ?? "") !== (p.nota ?? "")) linhas.push(`~ ${id}: nota alterada`);
    if (novas.length) linhas.push(`+ ${id}: ${novas.length} respostas (${novas.slice(0, 8).join(", ")}${novas.length > 8 ? ", …" : ""})`);
    const formas = (r) => JSON.stringify([r.canonica, r.aceitas, r.traducoes]);
    const antesPorId = new Map(a.respostas.map((r) => [r.id, formas(r)]));
    const mudadas = p.respostas.filter((r) => antesPorId.has(r.id) && antesPorId.get(r.id) !== formas(r)).map((r) => r.canonica);
    if (mudadas.length) linhas.push(`~ ${id}: variantes alteradas em ${mudadas.length} respostas (${mudadas.slice(0, 8).join(", ")}${mudadas.length > 8 ? ", …" : ""})`);
    if (saiu.length) linhas.push(`- ${id}: ${saiu.length} respostas (${saiu.slice(0, 8).join(", ")}${saiu.length > 8 ? ", …" : ""})`);
  }
  for (const [id, a] of antes) if (!agora.has(id)) linhas.push(`- pergunta ${a.tema}#${id}`);
  console.log(linhas.length ? linhas.join("\n") : "sem diferenças");
}

function restaurar(pasta) {
  const origem = resolver(pasta);
  if (!process.argv.includes("--confirmar")) {
    comparar(pasta);
    console.log(`\nisso será desfeito. Para restaurar de verdade: node scripts/banco/backup.mjs restaurar ${pasta} --confirmar`);
    return;
  }
  criar(`auto-antes-de-restaurar-${pasta}`);
  // Copia tudo para uma área temporária primeiro; só depois troca, item por item, com rename.
  const temp = join(raiz, "backups", ".restaurando");
  rmSync(temp, { recursive: true, force: true });
  for (const item of ITENS) if (existsSync(join(origem, item))) cpSync(join(origem, item), join(temp, item), { recursive: true });
  for (const item of ITENS) {
    if (!existsSync(join(temp, item))) continue;
    const para = join(raiz, item);
    const velho = `${para}.velho`;
    rmSync(velho, { recursive: true, force: true });
    if (existsSync(para)) renameSync(para, velho);
    renameSync(join(temp, item), para);
    rmSync(velho, { recursive: true, force: true });
  }
  rmSync(temp, { recursive: true, force: true });
  console.log(`banco restaurado de ${origem}`);
  const ger = spawnSync(process.execPath, [join(raiz, "scripts", "gerar-perguntas.mjs")], { encoding: "utf8" });
  console.log(ger.status === 0 ? "JSON regerados a partir das fontes restauradas." : `falha ao regerar: ${ger.stderr}`);
  console.log("agora rode: node scripts/validar-perguntas.mjs · npm run check · npm test");
}

const [cmd, arg] = process.argv.slice(2);
const comandos = { criar, listar, comparar, restaurar };
if (!comandos[cmd]) {
  console.log("uso: node scripts/banco/backup.mjs <criar \"rótulo\" | listar | comparar <pasta> | restaurar <pasta> [--confirmar]>");
  process.exit(1);
}
try { comandos[cmd](arg); } catch (e) { console.error(`erro: ${e.message}`); process.exit(1); }
