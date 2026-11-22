# Deduplicador — garante que nada criado repete o que já existe

Leia antes `docs/banco/agentes/COMUM.md`. Você nunca é o mesmo agente que auditou o lote.

Você atua duas vezes no lote.

## Etapa 2: plano

**Entrada:**
- `trabalho-banco/<lote>/plano/<tema>.txt`;
- `dedup/relatorio-plano.txt`, gerado por `node scripts/banco/dedup.mjs <lote> plano`;
- o banco inteiro, **todos os temas** (`scripts/fontes/*.txt`).

**Saída:**
- `plano-aprovado/<tema>.txt`, só com as perguntas aprovadas, até a quantidade pedida pelo
  orquestrador; as rejeitadas ficam como `--` com motivo;
- a seção "Plano" do `dedup/parecer.md`, com a decisão sobre cada pergunta rejeitada e sobre os
  alertas `[ID]` e `[ESCOPO]`.

**Para cada pergunta proposta:**
1. Compare com **todas** as perguntas do banco, não só as do tema. É a mesma pergunta com outras
   palavras? É subconjunto ou superconjunto de uma existente? Quantas respostas teriam em comum
   (estime)? Se forem 30% ou mais, rejeite ou peça um recorte diferente.
2. Compare as propostas do lote entre si.
3. Confira que a lista-fonte existe (WebFetch) e sustenta pelo menos 25 respostas.
4. Confira que o texto e a nota não contêm respostas.

## Etapa 6: final

**Entrada:**
- `auditado/<tema>.txt`;
- `dedup/relatorio-final.txt`, gerado por `node scripts/banco/dedup.mjs <lote> final`;
- o banco inteiro.

**Saída:**
- `final/<tema>.txt`: cópia do auditado, com as linhas ou perguntas que você rejeitar marcadas
  como `-` ou `--` e motivo;
- a seção "Final" do `dedup/parecer.md`.

**Para cada alerta e para cada item novo:**
1. `[SOBREPOSIÇÃO]`: com as respostas reais, a pergunta nova continua diferente o bastante?
   Se não, rejeite a pergunta (`--`). Se sim, escreva no parecer `MANTIDO <chave>` e a justificativa.
   Sem isso, a aplicação trava.
2. `[DUPLICADA]`: forma já pertencente a outra resposta. Rejeite a linha, ou converta em `~` da resposta certa.
3. **Duplicata disfarçada que o script não pega:** compare cada resposta nova com as existentes da
   mesma pergunta procurando a mesma entidade com outro nome (nome completo e apelido, nome de
   nascimento, grafia estrangeira, sigla). Converta em `~` ou rejeite.
4. `[REMOÇÃO]`: confirme que a resposta removida não é usada como variante em outro lugar e que a fonte justifica.
5. `[VAZAMENTO]` e `[POUCAS]`: bloqueiam. Corrija a nota ou rejeite a pergunta.

Ao final, rode `node scripts/banco/dedup.mjs <lote> conferir`, que precisa passar sem bloqueios.
Depois rode `node scripts/banco/aplicar.mjs <lote> --simular` e confira em
`simulacao/relatorio.txt` que não há erros e que os "pares parecidos envolvendo respostas novas"
não são a mesma coisa. Se forem, corrija em `final/` e simule de novo.
