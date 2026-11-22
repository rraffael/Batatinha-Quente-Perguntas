// Valida data/perguntas/*.json: JSON/UTF-8 sem BOM, schema, ids únicos, mínimo de respostas
// e colisões entre formas (canonica + aceitas + traducoes) de respostas diferentes.
// Também lista (como aviso, para revisão humana) pares de formas de respostas diferentes
// a distância de edição <= 2 (ex.: gato/rato, caju/cajá, Gil/Gal).
// Uso: node scripts/validar-perguntas.mjs [--min 25] [--estatisticas] [--sem-similares]

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(raiz, "data", "perguntas");
const args = process.argv.slice(2);
const MIN = Number(args[args.indexOf("--min") + 1]) || 25;
const ESTATISTICAS = args.includes("--estatisticas");
const SIMILARES = !args.includes("--sem-similares");
const DIST_SIMILAR = 2;

const DIFICULDADES = new Set(["facil", "media", "dificil"]);
const RARIDADES = ["comum", "incomum", "raro", "epico", "lendario"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PREFIXO_MIN = 0.8;
// Pares de prefixo já revisados (palavras distintas e válidas): "<id> | <curta> | <longa>".
const PREFIXOS_REVISADOS = new Set(
  readFileSync(join(raiz, "scripts", "prefixos-revisados.txt"), "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("|").map((x, i) => (i === 0 ? x.trim() : normalizarRev(x))).join("|")),
);
function normalizarRev(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
const revisados = new Set();

// Igual ao jogo (src/shared/normalizar.ts): "&" vale "e".
const normalizar = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " e ").replace(/[^a-z0-9]+/g, " ").trim();

const similares = [];
const erros = [];
const avisos = [];
const erro = (onde, msg) => erros.push(`${onde}: ${msg}`);
const aviso = (onde, msg) => avisos.push(`${onde}: ${msg}`);

const ehTexto = (x) => typeof x === "string" && x.trim().length > 0;
const ehListaTexto = (x) => Array.isArray(x) && x.every(ehTexto);

const idsPerguntas = new Map();
const resumo = [];

function formasDe(r) {
  const formas = [r.canonica, ...(r.aceitas ?? [])];
  for (const lst of Object.values(r.traducoes ?? {})) formas.push(...lst);
  return formas.filter(ehTexto);
}

// O texto e a nota aparecem na tela: nenhum trecho deles pode valer como resposta da pergunta.
// Usa as mesmas regras do jogo (src/server/casamento.ts): exato, prefixo de 80% de uma forma em português
// e erro de digitação (1, ou 2 a partir de 9 letras). Traduções só contam exatas.
// Formas de uma letra ficam de fora (o símbolo "O" casaria com o artigo "o").
function validarVazamento(onde, p) {
  for (const campo of ["texto", "nota"]) {
    if (!ehTexto(p[campo])) continue;
    const palavras = normalizar(p[campo]).split(" ");
    const trechos = new Set();
    for (let i = 0; i < palavras.length; i++) for (let n = 1; n <= 4 && i + n <= palavras.length; n++) trechos.add(palavras.slice(i, i + n).join(" "));
    for (const r of p.respostas ?? []) {
      const pt = [r.canonica, ...(r.aceitas ?? [])].map((x) => [x, normalizar(x)]);
      const tr = Object.values(r.traducoes ?? {}).flat().map((x) => [x, normalizar(x)]);
      let achou;
      for (const t of trechos) {
        achou = [...pt, ...tr].find(([, n]) => n.length > 1 && n === t)
          ?? pt.find(([, n]) => t.length >= 2 && n.length > t.length && n.startsWith(t) && t.length >= PREFIXO_MIN * n.length)
          ?? (t.length >= 5 ? pt.find(([, n]) => { const lim = t.length >= 9 ? 2 : 1; return n.length >= 5 && distancia(t, n, lim) <= lim; }) : undefined);
        if (achou) { achou = { forma: achou[0], trecho: t }; break; }
      }
      if (achou) erro(`${onde}/${r.id}`, `${campo === "nota" ? "a nota" : "o texto"} da pergunta revela a resposta "${achou.forma}" (trecho "${achou.trecho}")`);
    }
  }
}

// Fora dos temas de obras e produtos, nomes que só diferem pelo número são UMA resposta (Ramsés I e II → Ramsés).
// Deve bater com TEMAS_OBRAS de scripts/banco/lib.mjs.
const TEMAS_OBRAS = new Set(["cinema-tv", "anime-desenho", "novelas-tv-br", "games", "marcas-empresas", "musica-br", "musica-internacional"]);
function validarNumerados(onde, tema, respostas) {
  if (TEMAS_OBRAS.has(tema)) return;
  const porBase = new Map();
  for (const r of respostas) {
    const n = normalizar(r.canonica);
    const b = semNumeral(n);
    if (b === n && !respostas.some((o) => o !== r && semNumeral(normalizar(o.canonica)) === n && normalizar(o.canonica) !== n)) continue;
    (porBase.get(b) ?? porBase.set(b, []).get(b)).push(r.canonica);
  }
  for (const [b, lst] of porBase) if (lst.length > 1) erro(onde, `respostas que só diferem pelo número devem ser uma só ("${b}"): ${lst.join(", ")}`);
}

// Levenshtein com corte: devolve limite + 1 se a distância passar do limite.
function distancia(a, b, limite) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      atual.push(v);
      if (v < menor) menor = v;
    }
    if (menor > limite) return limite + 1;
    ant = atual;
  }
  return ant[b.length];
}

function listarSimilares(onde, todas) {
  const vistos = new Set();
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      const a = todas[i];
      const b = todas[j];
      if (a.id === b.id || a.n === b.n) continue;
      const chave = [a.id, b.id].sort().join("|");
      if (vistos.has(chave)) continue;
      // Formas muito curtas (siglas, símbolos químicos) ficam sempre "perto" umas das outras:
      // distância 1 só conta a partir de 3 letras e distância 2 a partir de 5.
      const menor = Math.min(a.n.length, b.n.length);
      if (menor < 3) continue;
      const limite = menor >= 5 ? DIST_SIMILAR : 1;
      const d = distancia(a.n, b.n, limite);
      if (d <= limite) {
        vistos.add(chave);
        similares.push(`${onde}: "${a.f}" (${a.id}) ~ "${b.f}" (${b.id}) [dist ${d}]`);
      }
    }
  }
}

// Tira um numeral final (romano até XXXIX ou arábico) separado por espaço: "ramses ii" → "ramses".
const NUMERAL_FINAL = /\s(?:\d+|x{0,3}(?:ix|iv|v?i{0,3}))$/;
const semNumeral = (n) => n.replace(NUMERAL_FINAL, "");

function validarColisoes(onde, respostas) {
  const dono = new Map(); // forma normalizada -> id da resposta
  const todas = [];
  for (const r of respostas) {
    const proprias = new Set();
    const formasPt = new Set([r.canonica, ...(r.aceitas ?? [])]);
    for (const f of formasDe(r)) {
      const n = normalizar(f);
      if (!n) { erro(`${onde}/${r.id}`, `forma vazia após normalizar: "${f}"`); continue; }
      if (proprias.has(n)) continue;
      proprias.add(n);
      const outro = dono.get(n);
      if (outro && outro !== r.id) erro(`${onde}`, `forma "${f}" (${n}) pertence a "${outro}" e "${r.id}"`);
      else dono.set(n, r.id);
      todas.push({ n, id: r.id, f, pt: formasPt.has(f) });
    }
  }
  if (SIMILARES) listarSimilares(onde, todas);
  todas.sort((a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0));
  // Em ordem lexicográfica, toda forma b que tem a como prefixo vem logo depois de a.
  for (let i = 0; i < todas.length; i++) {
    const a = todas[i];
    for (let j = i + 1; j < todas.length && todas[j].n.startsWith(a.n); j++) {
      const b = todas[j];
      if (b.id === a.id || b.n === a.n) continue;
      // Traduções só valem digitadas exatamente (casamento.ts), então não entram no prefixo.
      if (!a.pt || !b.pt) continue;
      // Obras e produtos numerados (Carros/Carros 2, Revolution/Revolution 9, Ahmose I/Ahmose II)
      // são respostas distintas de propósito; a forma exata sempre vence no casamento.
      if (semNumeral(a.n) === semNumeral(b.n)) continue;
      if (a.n.length >= PREFIXO_MIN * b.n.length) {
        // Palavras distintas e válidas (Pulga/Pulgão) podem ficar se revisadas em prefixos-revisados.txt.
        const chave = `${onde.split("#").pop()}|${a.n}|${b.n}`;
        if (PREFIXOS_REVISADOS.has(chave)) { revisados.add(chave); continue; }
        erro(onde, `prefixo ambíguo: "${a.f}" (${a.id}) cobre ${Math.round((100 * a.n.length) / b.n.length)}% de "${b.f}" (${b.id}) — corrija ou registre em scripts/prefixos-revisados.txt`);
      }
    }
  }
}

function validarArquivo(arquivo) {
  const bruto = readFileSync(join(dir, arquivo));
  if (bruto[0] === 0xef && bruto[1] === 0xbb && bruto[2] === 0xbf) erro(arquivo, "arquivo com BOM");
  let tema;
  try {
    tema = JSON.parse(bruto.toString("utf8"));
  } catch (e) {
    erro(arquivo, `JSON inválido: ${e.message}`);
    return;
  }
  if (!ehTexto(tema.tema)) erro(arquivo, "campo 'tema' ausente");
  if (!ehTexto(tema.nome)) erro(arquivo, "campo 'nome' ausente");
  if (!Array.isArray(tema.perguntas) || tema.perguntas.length === 0) {
    erro(arquivo, "'perguntas' deve ser lista não vazia");
    return;
  }
  if (tema.tema && arquivo !== `${tema.tema}.json`) aviso(arquivo, `nome do arquivo difere do tema "${tema.tema}"`);

  const raridadeTema = Object.fromEntries(RARIDADES.map((r) => [r, 0]));
  let totalRespostas = 0;

  for (const [i, p] of tema.perguntas.entries()) {
    const onde = `${arquivo}#${p.id ?? i}`;
    if (!ehTexto(p.id) || !SLUG.test(p.id)) erro(onde, "id da pergunta inválido");
    else if (idsPerguntas.has(p.id)) erro(onde, `id repetido (também em ${idsPerguntas.get(p.id)})`);
    else idsPerguntas.set(p.id, arquivo);
    if (!ehTexto(p.texto)) erro(onde, "texto ausente");
    if (!DIFICULDADES.has(p.dificuldade)) erro(onde, `dificuldade inválida: ${p.dificuldade}`);
    if (!ehListaTexto(p.tags)) erro(onde, "tags deve ser lista de textos");
    if (!ehTexto(p.fonte)) erro(onde, "fonte ausente");
    if (p.nota !== undefined && !ehTexto(p.nota)) erro(onde, "nota deve ser texto não vazio");
    if (p.nota && p.nota.length > 160) aviso(onde, `nota longa (${p.nota.length} caracteres)`);
    if (p.atualizadoEm !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.atualizadoEm)) erro(onde, "atualizadoEm deve ser AAAA-MM");
    if (!Array.isArray(p.respostas)) { erro(onde, "respostas ausente"); continue; }
    if (p.respostas.length < MIN) erro(onde, `apenas ${p.respostas.length} respostas (mínimo ${MIN})`);

    const idsResp = new Set();
    const raridade = Object.fromEntries(RARIDADES.map((r) => [r, 0]));
    for (const r of p.respostas) {
      const ondeR = `${onde}/${r.id}`;
      if (!ehTexto(r.id) || !SLUG.test(r.id)) erro(ondeR, "id da resposta inválido");
      else if (idsResp.has(r.id)) erro(ondeR, "id de resposta repetido");
      idsResp.add(r.id);
      if (!ehTexto(r.canonica)) erro(ondeR, "canonica ausente");
      if (!ehListaTexto(r.aceitas)) erro(ondeR, "aceitas deve ser lista de textos");
      if (typeof r.traducoes !== "object" || r.traducoes === null || Array.isArray(r.traducoes)) erro(ondeR, "traducoes deve ser objeto");
      else for (const [lng, lst] of Object.entries(r.traducoes)) {
        if (!/^[a-z]{2}$/.test(lng)) erro(ondeR, `código de idioma inválido: ${lng}`);
        if (!ehListaTexto(lst)) erro(ondeR, `traducoes.${lng} deve ser lista de textos`);
      }
      if (!RARIDADES.includes(r.raridadeInicial)) erro(ondeR, `raridadeInicial inválida: ${r.raridadeInicial}`);
      else { raridade[r.raridadeInicial]++; raridadeTema[r.raridadeInicial]++; }
    }
    totalRespostas += p.respostas.length;
    validarColisoes(onde, p.respostas);
    validarVazamento(onde, p);
    validarNumerados(onde, tema.tema, p.respostas);

    const comuns = raridade.comum + raridade.incomum;
    if (comuns < p.respostas.length * 0.3) aviso(onde, `poucas respostas comuns/incomuns (${comuns}/${p.respostas.length})`);
    if (raridade.comum === 0) aviso(onde, "nenhuma resposta comum");
  }
  resumo.push({ arquivo, perguntas: tema.perguntas.length, respostas: totalRespostas, raridade: raridadeTema });
}

const arquivos = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
if (arquivos.length === 0) erro(dir, "nenhum arquivo .json encontrado");
arquivos.forEach(validarArquivo);
for (const chave of PREFIXOS_REVISADOS) {
  if (!revisados.has(chave)) aviso("prefixos-revisados.txt", `par não encontrado no banco (pode remover): ${chave}`);
}

if (ESTATISTICAS || erros.length === 0) {
  const tot = { perguntas: 0, respostas: 0, raridade: Object.fromEntries(RARIDADES.map((r) => [r, 0])) };
  console.log("tema | perguntas | respostas | " + RARIDADES.join(" / "));
  for (const r of resumo) {
    console.log(`${r.arquivo} | ${r.perguntas} | ${r.respostas} | ${RARIDADES.map((k) => r.raridade[k]).join(" / ")}`);
    tot.perguntas += r.perguntas;
    tot.respostas += r.respostas;
    for (const k of RARIDADES) tot.raridade[k] += r.raridade[k];
  }
  console.log(`TOTAL | ${tot.perguntas} | ${tot.respostas} | ${RARIDADES.map((k) => tot.raridade[k]).join(" / ")}`);
}

for (const a of avisos) console.warn(`AVISO ${a}`);
for (const s of similares) console.warn(`SIMILAR ${s}`);
for (const e of erros) console.error(`ERRO ${e}`);
console.log(`\n${arquivos.length} arquivos, ${erros.length} erros, ${avisos.length} avisos, ${similares.length} pares similares para revisão`);
process.exit(erros.length ? 1 : 0);
