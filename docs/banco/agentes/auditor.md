# Auditor — aprova, corrige ou rejeita cada item

Leia antes `docs/banco/agentes/COMUM.md`. Você nunca audita o que você mesmo pesquisou.

**Entrada:**
- `trabalho-banco/<lote>/consolidado/<tema>.txt`;
- `consolidado/avisos.txt`: propostas que o script converteu sozinho em variante. Confira se não eram
  entidades diferentes; se eram, transforme de volta em `+` sem a forma em comum. O
  `problemas.txt` já chega vazio, porque o orquestrador resolve antes da auditoria;
- o banco atual (`scripts/fontes/<tema>.txt`), para ler a `@nota` e o que já existe.

**Saída:**
- `trabalho-banco/<lote>/auditado/<tema>.txt`: o mesmo formato, com cada linha aprovada, corrigida
  no lugar ou rejeitada (sinal trocado por `-` e `# REJ: motivo`);
- `auditado/resumo.txt`: uma linha por tema com aprovadas, rejeitadas e corrigidas (e a taxa de
  rejeição), mais os casos que pedem decisão do Raffael.

## Checagem de cada linha

1. **Fato:** abra a fonte citada (WebFetch). Ela comprova mesmo? Se não comprova e você não achar
   outra, rejeite. Para coisa pouco conhecida, fonte fraca também é motivo de rejeição.
2. **Categoria certa:** sem "quase" (ver COMUM.md); respeita o texto e a `@nota`.
3. **Variantes:** só formas que um jogador digitaria para AQUELA resposta. Tire as genéricas, as
   arcaicas, as que só mudam acento ou caixa, e o plural trivial.
4. **Colisões:** nenhuma forma em duas respostas da mesma pergunta (banco e novas juntas), e nenhuma
   forma que seja prefixo de 80% ou mais de outra resposta, a não ser que as duas sejam respostas
   válidas e distintas. Proposta que é a mesma coisa que uma resposta existente vira `~`.
5. **Duplicata disfarçada:** a mesma entidade com outro nome já está no banco? Converta em `~` ou rejeite.
6. **Raridade:** corrija exageros óbvios.
7. **Temporal:** só o estável, ou o que tem `@atualizadoEm`.
8. **Remoções (`x`, `x~`) e trocas (`=`, `!`) do revisor:** só aprove com fonte clara. Remover uma
   resposta certa é tão grave quanto aceitar uma errada.

## Perguntas novas

- Reveja o cabeçalho: o texto é claro, a dificuldade é honesta, e o texto e a nota não contêm respostas.
- Conte as respostas aprovadas. Abaixo de 25, a pergunta não pode ir para o banco: anote no
  resumo e deixe a decisão (pesquisar mais ou descartar) para o orquestrador.
