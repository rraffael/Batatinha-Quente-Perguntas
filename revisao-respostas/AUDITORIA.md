# Instruções do auditor

Você audita propostas de respostas novas para o banco do jogo "Batatá Quentá" (batata quente de
perguntas em português do Brasil; o jogador digita uma resposta para "Cite um X"). Leia também
`revisao-respostas/BRIEFING.md` (contexto e formato). Regra de ouro: **100% correto**. Uma resposta
errada aceita estraga o jogo; uma resposta certa em falta só é uma pena. **Na dúvida, rejeite.**

## Entrada (por tema)
- `revisao-respostas/auditoria/consolidado/<tema>.txt` — propostas já sem duplicatas do banco:
  - `== <id>    # <texto da pergunta>`
  - `+ <Canônica> | <aceitas> | <en> | <es> | <c|i|r|e|l> | <fontes>    # origem`
  - `~ <Canônica existente> | <novas aceitas> | <fontes>    # origem`
- `scripts/fontes/<tema>.txt` — banco atual (somente leitura). Leia a `@nota` de cada pergunta.
- `revisao-respostas/auditoria/problemas.txt` — conflitos detectados (resolva os do seu tema).

## Saída
`revisao-respostas/auditoria/aprovado/<tema>.txt` — mesmo formato do consolidado, com:
- linhas aprovadas mantidas (pode CORRIGIR: canônica, grafia, raridade, tirar aceitas/en/es ruins);
- linhas rejeitadas trocadas de `+`/`~` para `-` e com motivo curto: `- Fulano | ... # REJ: não é brasileiro`;
- todas as linhas `==` mantidas.
E acrescente uma linha por tema em `revisao-respostas/auditoria/resumo-<seu-lote>.txt`:
`<tema>: X aprovadas, Y rejeitadas, Z corrigidas — principais motivos`.

## O que checar em cada linha
1. **Fato**: a resposta responde de verdade à pergunta e respeita a `@nota` e o texto (nacionalidade,
   época, sufixo, categoria). Use seu conhecimento; quando não tiver certeza, verifique na web
   (WebSearch/WebFetch). Se não conseguir confirmar algo pouco conhecido, rejeite.
2. **Categoria certa**: nada de "quase" (ex.: revolta que não foi guerra, governante que não era
   faraó, personagem que não é do grupo pedido, marca que não é do ramo, obra que não é brasileira).
3. **Variantes** (`aceitas`, `en`, `es`, `~`): só formas que um jogador realmente digitaria para
   AQUELA resposta. Rejeite variantes genéricas que poderiam ser outra resposta (ex.: "Gabinete"
   para "Armário", "Rio" sozinho), nomes em latim/arcaicos inúteis, e o que só difere em acento,
   caixa ou pontuação (o jogo já ignora isso). Tire plural/singular trivial de palavras ≥ 5 letras
   (o jogo tolera 1 erro de digitação).
4. **Colisões**: nenhuma forma pode pertencer a duas respostas da mesma pergunta (banco + novas).
   Também evite forma que seja prefixo de ≥ 80% de outra resposta (ex.: "Tamanduá" vs "Tamanduá-mirim").
   Quando duas propostas são a mesma coisa, una numa só; quando a proposta nova é na verdade uma
   variante de resposta existente, converta para `~`.
5. **Duplicata disfarçada**: a mesma entidade com outro nome já existe no banco (apelido, nome
   artístico, nome completo) → converta para `~` ou rejeite.
6. **Raridade**: c/i/r/e/l = quão lembrada por um brasileiro médio. Corrija exageros óbvios.
7. **Temporal**: nomes de estádio, clubes por divisão, cargos atuais — só aceite o que é estável
   ou se a pergunta tiver `@atualizadoEm`. Nome antigo de estádio pode ficar como aceita.
8. Nada ofensivo, adulto ou palavrão.

## Regras duras
- Escreva SOMENTE em `revisao-respostas/auditoria/aprovado/` e no seu `resumo-*.txt`.
- Não leia nem escreva fora de `D:\Projeto Pessoal\Batatinha-Quente-Perguntas`. Não rode git, npm, npx.
- Grave tema a tema. Ao final, responda só com o resumo (contagens e casos que valem decisão humana).
