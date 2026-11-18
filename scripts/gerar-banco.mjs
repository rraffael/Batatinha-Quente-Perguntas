// Junta data/perguntas/*.json num único módulo usado só pelo servidor.
// O banco NUNCA vai para o cliente (evita vazar as respostas).
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pastaDados = join(raiz, 'data', 'perguntas');
const destino = join(raiz, 'src', 'server', 'generated', 'banco.json');

const temas = [];
const perguntas = [];

for (const arquivo of readdirSync(pastaDados).filter((f) => f.endsWith('.json')).sort()) {
  const texto = readFileSync(join(pastaDados, arquivo), 'utf8').replace(/^﻿/, '');
  const dados = JSON.parse(texto);
  let qtd = 0;
  for (const p of dados.perguntas) {
    perguntas.push({
      id: p.id,
      tema: dados.tema,
      texto: p.texto,
      dificuldade: p.dificuldade,
      ...(p.nota ? { nota: p.nota } : {}),
      respostas: p.respostas.map((r) => ({
        id: r.id,
        c: r.canonica,
        a: r.aceitas ?? [],
        t: Object.values(r.traducoes ?? {}).flat(),
        r: r.raridadeInicial,
      })),
    });
    qtd++;
  }
  temas.push({ id: dados.tema, nome: dados.nome, qtd });
}

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify({ temas, perguntas }));
const respostas = perguntas.reduce((s, p) => s + p.respostas.length, 0);
console.log(`banco: ${temas.length} temas, ${perguntas.length} perguntas, ${respostas} respostas`);
