# Formatos do processo de incremento

Todos os arquivos são texto UTF-8. Linhas vazias e linhas que começam com `#` são ignoradas.
Um comentário no fim da linha começa com espaço, `#` e espaço (`    # comentário`).
O `#` colado numa URL (âncora) não conta como comentário.

## Banco (`scripts/fontes/<tema>.txt`), só como referência

```
== <id> | <texto> | <facil|media|dificil> | <tag1;tag2> | <url da lista-fonte>
@nota <escopo, sem citar respostas>
<canônica> | <aceitas a;b> | <en a;b> | <es a;b> | <c|i|r|e|l>
```

- Campos do fim podem faltar: `<canônica> | <rar>` ou `<canônica> | <aceitas> | <rar>`.
- Raridade é o quanto um brasileiro médio lembra: `c` comum, `i` incomum, `r` raro, `e` épico, `l` lendário.
- Dentro da pergunta, as linhas vão da mais lembrada para a menos lembrada; o gerador recalibra a raridade a partir disso.

## Plano (`plano/<tema>.txt` e `plano-aprovado/<tema>.txt`)

```
== NOVA <id> | <texto> | <facil|media|dificil> | <tag1;tag2> | <url da lista-fonte>
@nota <escopo, sem citar respostas>            (opcional)
# universo: fechado, ~N itens | aberto, estimativa N
# não sobrepõe: <perguntas existentes parecidas e por que são diferentes>
```

No `plano-aprovado/`, uma pergunta rejeitada tem o `==` trocado por `--` e um motivo:
`-- <id> | …    # REJ: sobrepõe his-presidentes-brasil`.

## Propostas (`propostas/<papel>/<tema>.txt`)

```
== <id>                                     (pergunta existente ou NOVA do plano aprovado; só o id)
+ <Canônica> | <aceitas a;b> | <en a;b> | <es a;b> | <c|i|r|e|l> | <url> [url…]
~ <Canônica existente> | <novas aceitas a;b> | <url>
x <Canônica existente> | <motivo> | <url>               (só o revisor: remover resposta errada)
x~ <Canônica existente> | <formas a;b> | <motivo>       (só o revisor: remover variantes ruins)
= <Canônica existente> | <nova canônica> | <motivo>     (só o revisor: trocar a canônica; a antiga vira variante)
! <texto|nota> | <novo valor> | <motivo>               (só o revisor: corrigir texto ou nota)
# fim                                                  (obrigatório no fim de CADA bloco)
```

Contagem de campos fixa: `+` tem 6; `~`, `x`, `x~`, `=` e `!` têm 3. Campo vazio fica
vazio entre barras (`| |`). A canônica de `~`, `x`, `x~` e `=` é escrita exatamente como está no banco.
Nunca use `x` + `+` para trocar a canônica: use `=`.

A linha `# fim` fecha o bloco. Se a sessão cair no meio de uma linha, o bloco fica sem `# fim` e o
consolidador acusa, em vez de aceitar uma URL cortada. Ao continuar um arquivo, confira se o último
bloco tem `# fim`; se não tiver, refaça esse bloco.

## Consolidado, auditado e final (`consolidado/`, `auditado/`, `final/`)

Mesmo formato das propostas, com estas diferenças:
- a pergunta nova traz o cabeçalho completo (`== NOVA <id> | texto | … | url`) e a `@nota`;
- a pergunta existente traz `== <id>    # <texto>`;
- o fim da linha diz de onde veio (`# generica,profunda`).

O auditor e o deduplicador:
- **corrigem** uma linha editando-a no lugar;
- **rejeitam** uma linha trocando o sinal por `-` e anotando o motivo: `- Fulano | … # REJ: não é brasileiro`;
- **rejeitam uma pergunta inteira** trocando `==` por `--`.

O `aplicar.mjs` ignora linhas `-` e blocos `--`. O `--` só vale seguido do id da pergunta;
numa linha de resposta, ele é acusado como erro.

## Resumos e pareceres

- `auditado/resumo.txt`: uma linha por tema, no formato
  `<tema>: X aprovadas, Y rejeitadas, Z corrigidas — principais motivos`,
  e depois os casos que pedem decisão do Raffael.
- `dedup/parecer.md`, com as seções "Plano" e "Final":
  - decisão escrita para cada alerta que bloqueia (`→ rejeitado`, `→ convertido em variante de …`, `→ corrigido`);
  - para manter de propósito uma sobreposição, a linha `MANTIDO <chave>` e a justificativa (a chave
    aparece entre `< >` no relatório);
  - os alertas informativos (`[ESCOPO]`, `[FONTE]`, `[REMOÇÃO]`, `[TROCA]`) só precisam de comentário
    quando houver algo a dizer.

## Arquivos gerados pelos scripts

- `consolidado/problemas.txt`: bloqueia a auditoria até ficar vazio.
- `consolidado/avisos.txt`: conversões automáticas em variante (`[CONVERTIDO]`, `[NUMERAL]`, `[JÁ EXISTE]`), que o auditor confere.
- `BASE`: impressão digital do banco na consolidação. O `aplicar.mjs` trava se o banco mudou depois.
- `APLICADO`: gravado depois da aplicação; impede aplicar o mesmo lote duas vezes.
- `docs/banco/fontes-respostas/<tema>.tsv` (versionado): data, lote, pergunta, operação, resposta, detalhe e fontes de tudo o que foi aplicado.
