# Pesquisador — preenche respostas

Leia antes `docs/banco/agentes/COMUM.md`.

**Entrada:** o lote, o seu papel (`generica`, `profunda` ou `listas`) e os temas.
- Perguntas existentes: `scripts/fontes/<tema>.txt`.
- Perguntas novas: `trabalho-banco/<lote>/plano-aprovado/<tema>.txt`, que ainda não têm nenhuma resposta.

**Saída:** `trabalho-banco/<lote>/propostas/<papel>/<tema>.txt`, no formato "Propostas" de
`docs/banco/FORMATO.md`. Use só `+` e `~`.

## Os três papéis

Perguntas **novas** recebem os três papéis. Perguntas **existentes** recebem só o papel "listas"
(e o revisor de existentes, que é outro briefing).

- **generica:** pense como um jogador brasileiro comum. O que as pessoas digitariam de primeira?
  Respostas populares, apelidos, nomes curtos, grafias alternativas comuns, nomes em inglês muito
  usados no Brasil, siglas consagradas.
- **profunda:** respostas válidas menos óbvias, que um conhecedor daria (raras, épicas e lendárias).
  Vá fundo, mas só com fato verificável.
- **listas:** confronte cada pergunta com a lista completa da sua fonte (lista oficial, artigo-lista
  da Wikipédia) e proponha tudo o que falta. Para universos fechados, confira também no Wikidata.
  Uma consulta em `https://query.wikidata.org/` serve como fonte, e os rótulos alternativos em
  português são candidatos a variante. Use o Wikidata como conferência, não como única fonte: ele
  pode estar incompleto. Perguntas abertas sem lista fechada podem ser puladas.
  - Se existir `trabalho-banco/<lote>/pistas/<tema>.txt`, use-o como lista de suspeitos: o que os
    jogadores digitaram e foi recusado. Cada pista só vira proposta com fonte.

## Regras

1. Para **pergunta nova**, a meta é de **40 respostas ou mais** somando os três papéis, e o mínimo
   absoluto é 25. Ordene da mais lembrada para a menos lembrada.
2. Antes de propor, confira se a resposta já existe na pergunta (canônica, aceitas ou traduções,
   ignorando acento e caixa). Se existe, não repita; se faltar só uma forma, use `~`.
3. Respeite o texto e a `@nota` à risca: nacionalidade, época, sufixo e categoria.
4. Variante (`aceitas`, `en`, `es`, `~`) só se um jogador realmente a digitaria para AQUELA resposta.
   Não proponha o que só muda acento, caixa ou pontuação (o jogo já ignora isso), nem singular ou
   plural trivial de palavras com 5 letras ou mais (o jogo tolera um erro de digitação).
5. Uma variante não pode ser forma de outra resposta da mesma pergunta, nem prefixo de 80% ou mais
   de outra resposta.
6. A raridade é o quanto um brasileiro médio lembra (`c`, `i`, `r`, `e`, `l`), não o quanto é importante.
7. Cada linha `+` e `~` termina com a URL que comprova. Mais de uma URL vai separada por espaço.
8. Cada bloco (`== <id>` e suas linhas) termina com a linha `# fim`.
9. Não proponha "Fulano III" se o banco já tem "Fulano" (fora de filmes, séries, jogos e produtos):
   proponha `~ Fulano | Fulano III | url`.
