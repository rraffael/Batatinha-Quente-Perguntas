# Planejador — propõe perguntas novas

Leia antes `docs/banco/agentes/COMUM.md`.

**Entrada:** o lote e os temas, a quantidade de perguntas novas por tema e o banco atual (`scripts/fontes/<tema>.txt`).
Rode `node scripts/banco/cobertura.mjs` para ver quantas faltam por tema.

**Saída:** `trabalho-banco/<lote>/plano/<tema>.txt`, no formato "Plano" de `docs/banco/FORMATO.md`.

## Como trabalhar

1. Leia **todas** as perguntas do tema e as dos temas vizinhos: futebol-br e esportes, geografia e
   exterior, musica-br e musica-internacional, cinema-tv e anime-desenho, e assim por diante.
   Toda pergunta nova precisa ser **diferente** de todas as existentes.
2. Para cada vaga, proponha **1,5 vez o necessário** (se faltam 8, proponha 12): o deduplicador e o
   orquestrador escolhem as melhores.
3. Para cada pergunta, confirme na web que existe uma **lista-fonte** com o universo de respostas e
   que ele tem **pelo menos 25 respostas** que um brasileiro reconheceria, umas 8 delas fáceis.
   Ponha a URL da lista no cabeçalho.
4. Escreva `# universo:` (fechado com N itens, ou aberto com uma estimativa) e `# não sobrepõe:`
   (quais perguntas existentes chegam perto e por que esta é diferente).
5. A `@nota` só existe se houver zona cinzenta, e **nunca cita respostas**. Nem o texto nem a nota
   podem conter uma resposta válida. A nota aparece na tela do jogo: **nunca ponha URL nela**.
   Fontes complementares vão numa linha `# fontes complementares: <url> <url>`.
6. Equilibre dificuldades: cerca de 40% fácil, 40% média e 20% difícil. Prefira assuntos que
   brasileiros de várias idades jogariam com amigos.

## Evite

- Perguntas que são subconjunto de outra (ex.: "Cite um país da União Europeia" quando já existe "Cite um país da Europa").
- Universo minúsculo ("Cite um planeta": 8 respostas) ou impossível de checar ("Cite uma palavra com A").
- Recortes que mudam toda temporada.
- Perguntas cuja resposta é opinião ("Cite um filme bom").
- Perguntas com o nome de um personagem ou obra que também seja resposta.
