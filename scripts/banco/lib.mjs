// Funções comuns aos scripts do processo de incremento do banco (docs/banco/PROCESSO.md).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DIR_FONTES = join(RAIZ, "scripts", "fontes");
export const DIR_TRABALHO = join(RAIZ, "trabalho-banco");
export const NIVEIS = "cirel"; // comum, incomum, raro, épico, lendário
export const PAPEIS = ["generica", "profunda", "listas", "revisor"];
export const MIN_RESPOSTAS = 25;
// Temas de obras e produtos: aqui "Toy Story" e "Toy Story 2" são respostas diferentes.
export const TEMAS_OBRAS = new Set(["cinema-tv", "anime-desenho", "novelas-tv-br", "games", "marcas-empresas", "musica-br", "musica-internacional"]);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Mesma normalização do jogo (acentos, caixa e pontuação não contam; "&" vale "e").
export const normalizar = (s) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/&/g, " e ").replace(/[^a-z0-9]+/g, " ").trim();
// Tira um numeral final (romano até XXXIX ou arábico): "ramses ii" → "ramses". Recebe forma já normalizada.
export const semNumeral = (n) => n.replace(/\s(?:\d+|x{0,3}(?:ix|iv|v?i{0,3}))$/, "");
export const lista = (c) => (c ?? "").split(";").map((x) => x.trim()).filter(Boolean);
export const semComentario = (l) => l.replace(/\s+#\s.*$/, "").replace(/\s+#$/, "").trim();
export const temas = () => readdirSync(DIR_FONTES).filter((f) => f.endsWith(".txt")).map((f) => basename(f, ".txt")).sort();

export function dirLote(lote) {
  if (!lote) throw new Error("informe o nome do lote (veja trabalho-banco/)");
  const d = join(DIR_TRABALHO, lote);
  if (!existsSync(d)) throw new Error(`lote "${lote}" não existe em trabalho-banco/`);
  return d;
}

// Impressão digital das fontes do banco: muda sempre que qualquer scripts/fontes/*.txt muda.
export function hashFontes(dirFontes = DIR_FONTES) {
  const h = createHash("sha256");
  for (const f of readdirSync(dirFontes).filter((x) => x.endsWith(".txt")).sort()) h.update(f).update(readFileSync(join(dirFontes, f)));
  return h.digest("hex").slice(0, 16);
}

// Linha de resposta da fonte: "<canônica> | [aceitas] | [en] | [es] | <rar>".
export function lerLinhaResposta(l) {
  const p = l.split("|").map((x) => x.trim());
  const n = p.length;
  return { canonica: p[0], aceitas: n >= 3 ? lista(p[1]) : [], en: n >= 4 ? lista(p[2]) : [], es: n >= 5 ? lista(p[3]) : [], rar: p[n - 1] };
}

export function formatarResposta({ canonica, aceitas = [], en = [], es = [], rar }) {
  if (es.length) return [canonica, aceitas.join(";"), en.join(";"), es.join(";"), rar].join(" | ");
  if (en.length) return [canonica, aceitas.join(";"), en.join(";"), rar].join(" | ");
  if (aceitas.length) return [canonica, aceitas.join(";"), rar].join(" | ");
  return [canonica, rar].join(" | ");
}

export const formasDe = (r) => [r.canonica, ...r.aceitas, ...r.en, ...r.es];

// Lê scripts/fontes/<tema>.txt (ou outro caminho) em perguntas com respostas e um índice forma → canônica.
export function lerFonte(caminho) {
  const perguntas = new Map();
  let atual = null;
  for (const bruta of readFileSync(caminho, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const l = bruta.trim();
    if (!l || l.startsWith("#") || /^(tema|nome|opcional):/.test(l)) continue;
    if (l.startsWith("@nota ")) { if (atual) atual.nota = l.slice(6).trim(); continue; }
    if (l.startsWith("@")) continue;
    if (l.startsWith("==")) {
      const [id, texto, dificuldade, tags, fonte] = l.slice(2).split("|").map((x) => x.trim());
      atual = { id, texto, dificuldade, tags, fonte, nota: "", respostas: [], dono: new Map() };
      perguntas.set(id, atual);
      continue;
    }
    if (!atual) continue;
    const r = lerLinhaResposta(l);
    atual.respostas.push(r);
    for (const f of formasDe(r)) atual.dono.set(normalizar(f), r.canonica);
  }
  return perguntas;
}

// Banco inteiro: Map(id → pergunta com .tema).
export function lerBancoFontes() {
  const todas = new Map();
  for (const t of temas()) for (const [id, p] of lerFonte(join(DIR_FONTES, `${t}.txt`))) todas.set(id, { ...p, tema: t });
  return todas;
}

// Prefixos de id usados num tema ("his", "esp"…); pergunta nova precisa usar um deles.
export function prefixosDoTema(tema) {
  return new Set([...lerFonte(join(DIR_FONTES, `${tema}.txt`)).keys()].map((id) => id.split("-")[0]));
}

const CAMPOS = { "+": 6, "~": 3, x: 3, "x~": 3, "!": 3, "=": 3 };

// Arquivo de proposta/consolidado/auditado/final: blocos "== [NOVA] <id> [| texto | dif | tags | url]",
// "@nota", linhas de operação (+ ~ x x~ ! =), "-" (rejeitada) e "--" (pergunta rejeitada).
// Com exigirFim, todo bloco precisa terminar com a linha "# fim" (protege contra arquivo cortado).
export function lerPropostas(caminho, aoProblema = () => {}, { exigirFim = false } = {}) {
  const blocos = [];
  const vistos = new Set();
  let atual = null;
  const nomeArq = caminho.split(/[\\/]/).slice(-2).join("/");
  readFileSync(caminho, "utf8").replace(/^﻿/, "").split(/\r?\n/).forEach((bruta, i) => {
    const onde = `${nomeArq}:${i + 1}`;
    if (bruta.trim() === "# fim") { if (atual) atual.fechado = true; return; }
    const comentario = (bruta.match(/\s#\s(.*)$/) ?? [])[1] ?? "";
    const l = semComentario(bruta);
    if (!l || l.startsWith("#")) return;
    if (l.startsWith("--")) {
      const id = l.slice(2).split("|")[0].trim();
      if (!SLUG.test(id)) return aoProblema(`${onde}: "--" só rejeita pergunta inteira (seguido do id); para rejeitar uma linha use "-": ${l}`);
      atual = { rejeitada: true, id, ops: [], onde, fechado: false };
      blocos.push(atual);
      return;
    }
    if (l.startsWith("==")) {
      const corpo = l.slice(2).trim();
      const nova = /^NOVA\s/.test(corpo);
      const [id, texto, dificuldade, tags, fonte] = corpo.replace(/^NOVA\s+/, "").split("|").map((x) => x.trim());
      if (!SLUG.test(id ?? "")) return aoProblema(`${onde}: id de pergunta inválido "${id}"`);
      if (vistos.has(id)) aoProblema(`${onde}: pergunta ${id} aparece duas vezes no mesmo arquivo (junte os blocos)`);
      vistos.add(id);
      atual = { id, nova, texto, dificuldade, tags, fonte, nota: "", ops: [], onde, fechado: false };
      blocos.push(atual);
      return;
    }
    if (!atual) return aoProblema(`${onde}: linha fora de pergunta: ${l}`);
    if (atual.rejeitada) return;
    if (l.startsWith("@nota ")) { atual.nota = l.slice(6).trim(); return; }
    const m = l.match(/^(x~|\+|~|x|!|=|-)\s*(.*)$/);
    if (!m) return aoProblema(`${onde}: linha não reconhecida: ${l}`);
    const [, op, resto] = m;
    if (op === "-") return; // rejeitada pelo auditor ou pelo deduplicador
    const p = resto.split("|").map((x) => x.trim());
    if (p.length !== CAMPOS[op]) return aoProblema(`${onde}: "${op}" com ${p.length} campos (esperado ${CAMPOS[op]}): ${l}`);
    const item = { op, onde, comentario };
    const temUrl = (s) => /https?:\/\/[^\s/]+\.[^\s]+/.test(s);
    if (op === "+") {
      const [canonica, ac, en, es, rar, fontes] = p;
      if (!NIVEIS.includes(rar) || rar.length !== 1) return aoProblema(`${onde}: raridade inválida "${rar}"`);
      if (!temUrl(fontes)) return aoProblema(`${onde}: resposta sem fonte (URL): ${canonica}`);
      Object.assign(item, { canonica, aceitas: lista(ac), en: lista(en), es: lista(es), rar, fontes });
    } else if (op === "~") {
      const [canonica, ac, fontes] = p;
      if (!temUrl(fontes)) return aoProblema(`${onde}: variante sem fonte (URL): ${canonica}`);
      Object.assign(item, { canonica, aceitas: lista(ac), fontes });
    } else if (op === "x") {
      const [canonica, motivo, fontes] = p;
      if (!temUrl(fontes)) return aoProblema(`${onde}: remoção sem fonte (URL): ${canonica}`);
      Object.assign(item, { canonica, motivo, fontes });
    } else if (op === "x~") {
      const [canonica, formas, motivo] = p;
      Object.assign(item, { canonica, formas: lista(formas), motivo });
    } else if (op === "=") {
      const [canonica, nova, motivo] = p;
      if (!nova) return aoProblema(`${onde}: "=" sem a nova canônica`);
      Object.assign(item, { canonica, nova, motivo });
    } else {
      const [campo, valor, motivo] = p;
      if (!["texto", "nota"].includes(campo)) return aoProblema(`${onde}: "!" só altera texto ou nota`);
      Object.assign(item, { campo, valor, motivo });
    }
    atual.ops.push(item);
  });
  if (exigirFim) {
    for (const b of blocos) if (!b.fechado) aoProblema(`${b.onde}: bloco de ${b.id} sem a linha "# fim" (arquivo possivelmente cortado; confira a última linha)`);
  }
  return blocos.filter((b) => !b.rejeitada);
}

// Ids das perguntas rejeitadas ("--") num arquivo.
export function rejeitadasEm(caminho) {
  const ids = new Set();
  for (const l of readFileSync(caminho, "utf8").split(/\r?\n/)) {
    const m = semComentario(l).match(/^--\s*([a-z0-9-]+)/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

export function cabecalhoNova(b) {
  return `== NOVA ${b.id} | ${b.texto} | ${b.dificuldade} | ${b.tags} | ${b.fonte}`;
}

export function formatarOp(o) {
  const c = o.comentario ? `    # ${o.comentario}` : "";
  switch (o.op) {
    case "+": return `+ ${o.canonica} | ${o.aceitas.join(";")} | ${o.en.join(";")} | ${o.es.join(";")} | ${o.rar} | ${o.fontes}${c}`;
    case "~": return `~ ${o.canonica} | ${o.aceitas.join(";")} | ${o.fontes}${c}`;
    case "x": return `x ${o.canonica} | ${o.motivo} | ${o.fontes}${c}`;
    case "x~": return `x~ ${o.canonica} | ${o.formas.join(";")} | ${o.motivo}${c}`;
    case "=": return `= ${o.canonica} | ${o.nova} | ${o.motivo}${c}`;
    default: return `! ${o.campo} | ${o.valor} | ${o.motivo}${c}`;
  }
}

// Arquivos de tema de uma pasta do lote (ignora resumo.txt, problemas.txt etc.).
export function temasNaPasta(pasta) {
  if (!existsSync(pasta)) return [];
  const t = new Set(temas());
  return readdirSync(pasta).filter((f) => f.endsWith(".txt") && t.has(basename(f, ".txt"))).map((f) => basename(f, ".txt")).sort();
}
