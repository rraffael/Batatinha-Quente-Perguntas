# Briefing dos pesquisadores (revisão de respostas em falta)

Projeto: jogo "Batatá Quentá" (batata quente de perguntas em português do Brasil). Cada pergunta
pede "Cite um X" e os jogadores digitam respostas; toda resposta válida que falta no banco é um
jogador injustiçado. Regra de ouro: banco extenso e **100% correto**, com variantes sensatas.

## Onde está o banco
- `scripts/fontes/<tema>.txt` — fonte de cada tema (somente LEITURA; nunca edite).
  - `== <id> | <texto> | <dificuldade> | <tags> | <url>` abre uma pergunta.
  - `@nota ...` logo abaixo define o ESCOPO da pergunta (respeite-o à risca).
  - Linhas seguintes: `<canônica> | <aceitas a;b> | <en a;b> | <es a;b> | <c|i|r|e|l>`
    (campos podem faltar: `<canônica> | <rar>` ou `<canônica> | <aceitas> | <rar>`).
- O reconhecimento ignora acentos, maiúsculas e pontuação. Não proponha variantes que só mudam isso.

## Os três papéis
- **genérica** (`revisao-respostas/generica/<tema>.txt`): pense como um jogador brasileiro comum.
  O que as pessoas DIGITARIAM de primeira e não está no banco? Respostas populares esquecidas,
  apelidos, nomes curtos, grafias alternativas comuns (ex.: "Holanda"), nomes em inglês muito
  usados no Brasil, singular/plural quando faz sentido, siglas consagradas.
- **profunda** (`revisao-respostas/profunda/<tema>.txt`): respostas válidas menos óbvias, que um
  conhecedor do assunto daria (raras, épicas, lendárias). Vá fundo, mas só com fato verificável.
- **listas** (`revisao-respostas/listas/<tema>.txt`): para perguntas que têm um universo fechado
  ou listável (estados, capitais, posições, postos, elementos, coletivos, gentílicos, etc.),
  confronte o banco com uma lista oficial/completa e proponha TUDO que falta. Perguntas abertas
  (ex.: "cite um cantor") podem ser puladas neste papel.

## Formato de saída (um arquivo por tema e papel)
```
== <id-da-pergunta>
+ <Canônica> | <aceitas a;b> | <en a;b> | <es a;b> | <c|i|r|e|l> | <url da fonte>
~ <Canônica EXISTENTE exatamente como no banco> | <novas aceitas a;b> | <url da fonte>
```
- `+` resposta nova; `~` variante nova para resposta que já existe.
- Campos vazios ficam vazios entre barras (`| |`). Sempre 6 campos no `+` e 3 no `~`.
- **Fonte obrigatória** (URL real que comprove; prefira pt.wikipedia, fontes oficiais).
- Raridade = quão lembrada é por um brasileiro médio: c comum, i incomum, r raro, e épico, l lendário.
- Ordene de mais lembrada para menos. Só inclua perguntas que tenham propostas.

## Regras duras
1. Nada inventado. Na dúvida, NÃO proponha. Uma resposta errada é pior que dez em falta.
2. Antes de propor, confira se já existe (canônica OU aceitas, ignorando acento/caixa). Se existe,
   não repita. Confira também os arquivos já existentes em `revisao-respostas/*/<tema>.txt`
   para não duplicar o que outro pesquisador já propôs.
3. Respeite a `@nota` e o texto da pergunta (ex.: "terminada em -ista" exige terminar em -ista;
   "brasileiro" exige brasileiro).
4. Variante não pode colidir com outra resposta da mesma pergunta (ex.: não aceitar "Paraíba"
   como variante se "Paraíba" for outra resposta).
5. Nada de palavrões, conteúdo ofensivo ou adulto.
6. Escreva SOMENTE em `revisao-respostas/<papel>/<tema>.txt` (UTF-8). Se o arquivo já existir,
   ACRESCENTE no fim sem repetir o que já está lá. Não leia nem escreva fora da pasta do projeto
   `D:\Projeto Pessoal\Batatinha-Quente-Perguntas`. Não rode git, npm nem npx.
7. Grave em disco aos poucos (tema a tema), para não perder trabalho se a sessão cair.
