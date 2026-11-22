# Revisor de existentes — caça erros, ambiguidades e faltas no que já está no banco

Leia antes `docs/banco/agentes/COMUM.md`.

**Entrada:** o lote, os temas e o banco atual (`scripts/fontes/<tema>.txt`).
Rode `node scripts/validar-perguntas.mjs` (sem `--sem-similares`) e use os pares `SIMILAR` do seu tema como pista.

**Saída:** `trabalho-banco/<lote>/propostas/revisor/<tema>.txt`, no formato "Propostas" de
`docs/banco/FORMATO.md`. Você é o único papel que pode usar `x`, `x~` e `!`.

## O que procurar, pergunta por pergunta

1. **Resposta errada** (não responde à pergunta, fere a `@nota`, fato falso): `x <Canônica> | motivo | url`.
2. **Variante perigosa:** forma genérica que um jogador usaria para outra coisa, forma que confunde
   duas respostas, ou variante de outra entidade (`x~ <Canônica> | formas | motivo`).
3. **Duplicata disfarçada:** duas respostas que são a mesma entidade. Proponha `x` da mais fraca e
   `~` das formas dela na que fica, ambas com fonte.
4. **Canônica ruim:** grafia ou nome que não é o mais usado no Brasil. Use
   `= <canônica atual> | <nova canônica> | motivo`; a antiga vira variante. Nunca use `x` + `+`
   para isso, porque a consolidação acusa o conflito.
5. **Texto ou nota ambíguos**, ou que revelam resposta: `! texto | novo texto | motivo` ou `! nota | nova nota | motivo`.
6. **Respostas faltando:** as óbvias (`+`, com fonte). O grosso do preenchimento é dos pesquisadores;
   aqui entram as que você notar durante a revisão.
7. **Coisa temporal vencida:** cargo, nome de estádio, elenco desatualizado em pergunta com `@atualizadoEm`.

## Regras

- `x` exige fonte que mostre que a resposta está errada. Na dúvida, não remova; anote no resumo como dúvida.
- Não reescreva o que está certo só por estilo.
- Cada bloco termina com a linha `# fim`.
- Uma resposta não pode receber `x` e outra operação no mesmo lote.
- Se a correção for grande demais para o formato (ex.: dividir uma pergunta em duas), descreva no
  resumo final para o orquestrador levar ao Raffael.
