// Gera data/perguntas/<tema>.json a partir das fontes compactas em scripts/fontes/<tema>.txt
//
// Formato da fonte:
//   tema: geografia
//   nome: Geografia
//   opcional: sim        (opcional; tema desligado por padrão no lobby)
//   == <id> | <texto> | <facil|media|dificil> | <tag1;tag2> | <url fonte>
//   <canonica> | <rar>
//   <canonica> | <aceitas a;b> | <rar>
//   <canonica> | <aceitas> | <en a;b> | <rar>
//   <canonica> | <aceitas> | <en> | <es> | <rar>
//   @nota <texto curto exibido na tela explicando o escopo>   (opcional, logo após o "==")
//   @atualizadoEm <AAAA-MM>                                    (opcional, perguntas temporais)
// rar: c=comum, i=incomum, r=raro, e=epico, l=lendario — é a estimativa BRUTA do autor.
// A ordem das linhas dentro de cada nível também importa: da mais lembrada para a menos.
// Linhas vazias e iniciadas por # são ignoradas.
//
// Calibração: a raridadeInicial gravada no JSON é recalculada por pergunta a partir da
// ordem (nível bruto, posição na fonte), distribuindo ~30% comum, ~30% incomum, ~20% raro,
// ~12% épico e ~8% lendário, sem mover nenhuma resposta mais de 2 níveis do valor bruto.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dirFontes = join(raiz, "scripts", "fontes");
const dirSaida = join(raiz, "data", "perguntas");

const RARIDADES = { c: "comum", i: "incomum", r: "raro", e: "epico", l: "lendario" };
const NIVEIS = ["comum", "incomum", "raro", "epico", "lendario"];
const CORTES = [0.3, 0.6, 0.8, 0.92, 1]; // fração acumulada alvo por nível
const DESVIO_MAX = 2;

function calibrar(respostas) {
  const n = respostas.length;
  const ordem = respostas
    .map((r, i) => ({ r, i, nivel: NIVEIS.indexOf(r.raridadeInicial) }))
    .sort((a, b) => a.nivel - b.nivel || a.i - b.i);
  ordem.forEach(({ r, nivel }, k) => {
    const pos = (k + 0.5) / n;
    const alvo = CORTES.findIndex((c) => pos <= c);
    const final = Math.min(Math.max(alvo, nivel - DESVIO_MAX), nivel + DESVIO_MAX);
    r.raridadeInicial = NIVEIS[final];
  });
}

const normalizar = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();

const slug = (s) => normalizar(s).replace(/ /g, "-");

const lista = (campo) =>
  (campo ?? "").split(";").map((x) => x.trim()).filter(Boolean);

function gerarTema(arquivo) {
  const linhas = readFileSync(arquivo, "utf8").replace(/^﻿/, "").split(/\r?\n/);
  const tema = { tema: basename(arquivo, ".txt"), nome: "", perguntas: [] };
  let atual = null;

  linhas.forEach((bruta, i) => {
    const linha = bruta.trim();
    if (!linha || linha.startsWith("#")) return;
    const onde = `${basename(arquivo)}:${i + 1}`;

    if (linha.startsWith("tema:")) { tema.tema = linha.slice(5).trim(); return; }
    if (linha.startsWith("nome:")) { tema.nome = linha.slice(5).trim(); return; }
    // opcional: sim → tema fica desligado por padrão (só entra se o anfitrião escolher).
    if (linha.startsWith("opcional:")) {
      if (/^(sim|true)$/i.test(linha.slice(9).trim())) tema.opcional = true;
      return;
    }

    if (linha.startsWith("@nota ") || linha.startsWith("@atualizadoEm ")) {
      if (!atual) throw new Error(`${onde}: metadado fora de pergunta`);
      const [chave, ...resto] = linha.slice(1).split(" ");
      atual[chave] = resto.join(" ").trim();
      return;
    }

    if (linha.startsWith("==")) {
      const [id, texto, dificuldade, tags, fonte] = linha.slice(2).split("|").map((x) => x.trim());
      // nota/atualizadoEm são preenchidos depois, se existirem; a ordem das chaves fica estável.
      atual = { id, texto, dificuldade, tags: lista(tags), fonte: fonte ?? "", nota: undefined, atualizadoEm: undefined, respostas: [] };
      tema.perguntas.push(atual);
      return;
    }

    if (!atual) throw new Error(`${onde}: resposta fora de pergunta`);
    const partes = linha.split("|").map((x) => x.trim());
    const rar = RARIDADES[partes[partes.length - 1]];
    if (!rar || partes.length < 2 || partes.length > 5) throw new Error(`${onde}: linha inválida: ${linha}`);

    const canonica = partes[0];
    const n = partes.length;
    const chaveCanonica = normalizar(canonica);
    const semRepetir = (arr) => {
      const vistos = new Set([chaveCanonica]);
      return arr.filter((x) => {
        const k = normalizar(x);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });
    };

    // "Chitãozinho & Xororó" também deve aceitar "Chitãozinho e Xororó".
    const comE = (arr) => arr.flatMap((x) => (x.includes(" & ") ? [x, x.replaceAll(" & ", " e ")] : [x]));
    const aceitas = semRepetir(comE([canonica, ...(n >= 3 ? lista(partes[1]) : [])]));
    const traducoes = {};
    const en = semRepetir(n >= 4 ? lista(partes[2]) : []);
    const es = semRepetir(n >= 5 ? lista(partes[3]) : []);
    if (en.length) traducoes.en = en;
    if (es.length) traducoes.es = es;

    atual.respostas.push({ id: slug(canonica), canonica, aceitas, traducoes, raridadeInicial: rar });
  });

  for (const p of tema.perguntas) calibrar(p.respostas);
  return tema;
}

const arquivos = readdirSync(dirFontes).filter((f) => f.endsWith(".txt")).sort();
for (const f of arquivos) {
  const tema = gerarTema(join(dirFontes, f));
  const destino = join(dirSaida, `${tema.tema}.json`);
  writeFileSync(destino, JSON.stringify(tema, null, 2) + "\n", "utf8");
  const total = tema.perguntas.reduce((s, p) => s + p.respostas.length, 0);
  console.log(`${tema.tema}: ${tema.perguntas.length} perguntas, ${total} respostas`);
}
