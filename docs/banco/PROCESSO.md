# Processo de incremento do banco de perguntas

Como adicionar perguntas e respostas ao banco do Batatá Quentá, e revisar as que já existem, sem
perder a regra de ouro: **banco extenso, 100% correto, com variantes sensatas**.

O trabalho é feito em **lotes**, um grupo de temas por vez. Cada lote passa por papéis separados:
quem propõe não aprova, e quem aprova não é quem confere duplicidade. Os scripts fazem tudo o que é
mecânico (e travam o que estiver inconsistente); os agentes só fazem o que exige pesquisa e julgamento.

Formatos dos arquivos: [`FORMATO.md`](FORMATO.md). Instruções de cada papel: [`agentes/`](agentes/).

---

## Princípios (valem para todos os papéis)

1. **Nada sem fonte.** Toda pergunta nova cita uma lista-fonte (URL). Toda resposta, variante,
   remoção ou troca de canônica cita uma URL que a comprove. Ninguém cria pergunta ou resposta
   "de cabeça". As fontes de tudo o que foi aplicado ficam versionadas em
   `docs/banco/fontes-respostas/<tema>.tsv`.
   - Fontes preferidas: Wikipédia em português (listas e artigos), Wikidata (para conferir listas
     fechadas), sites oficiais (federações, órgãos públicos, Instituto Brasileiro de Geografia e
     Estatística, ligas), enciclopédias e dicionários.
2. **Na dúvida, fica de fora.** Uma resposta errada aceita estraga uma rodada. Uma resposta certa
   que falta só é uma pena.
3. **O jogo nunca mostra respostas.** O texto e a nota da pergunta aparecem na tela, e nenhum trecho
   deles pode valer como resposta. O validador usa as mesmas regras do jogo: exato, prefixo e erro
   de digitação. Por exemplo, "vilão" no texto entregaria "Visão".
4. **Escopo fechado.** O jogador sabe o que vale. Quando houver zona cinzenta, a `@nota` define o
   limite, sem dar exemplos que sejam respostas.
5. **Nomes que só diferem pelo número são uma resposta só** (Ramsés I e Ramsés II viram Ramsés,
   com as formas numeradas como variantes).
   - Exceção: obras e produtos (filmes, séries, animes, novelas, jogos, consoles, modelos de carro,
     músicas), em que cada número é uma resposta separada.
   - O gerador cria sozinho a versão em algarismo ("Ramsés 2").
   - O validador barra duas respostas que só diferem pelo número fora dos temas de obras.
6. **Nunca duplicar.** Nem pergunta repetida com outro texto, nem resposta repetida com outro nome:
   apelido, nome completo ou nome artístico vira variante da mesma resposta.
7. **Backup antes e depois de toda alteração no banco.** O `aplicar.mjs` faz isso sozinho.
8. **Português do Brasil.** A canônica usa a grafia mais usada no Brasil. Traduções (inglês e
   espanhol) só valem digitadas exatamente, então só entram as consagradas.

---

## Papéis

| Papel | Quem | Escreve (em `trabalho-banco/<lote>/`) |
|---|---|---|
| Orquestrador | Claude, na sessão principal | `ESTADO.md`; roda os scripts, dispara os agentes e relata ao Raffael |
| Planejador | sub-agente | `plano/<tema>.txt` |
| Pesquisador genérico | sub-agente (só perguntas novas) | `propostas/generica/<tema>.txt` |
| Pesquisador profundo | sub-agente (só perguntas novas) | `propostas/profunda/<tema>.txt` |
| Pesquisador de listas | sub-agente (perguntas novas e existentes) | `propostas/listas/<tema>.txt` |
| Revisor de existentes | sub-agente | `propostas/revisor/<tema>.txt` |
| Auditor | sub-agente, nunca o mesmo que pesquisou | `auditado/<tema>.txt`, `auditado/resumo.txt` |
| Deduplicador | sub-agente, nunca o mesmo que auditou | `plano-aprovado/`, `final/`, `dedup/parecer.md` |
| Raffael | humano | confere a `amostra.md` (pode dispensar) e decide os casos levados a ele |

Os agentes só escrevem dentro de `trabalho-banco/<lote>/`, nunca nas fontes do banco. Quem altera
`scripts/fontes/` é o `aplicar.mjs`, e só com o que chegou a `final/`.

---

## Etapas de um lote

Crie o lote com `node scripts/banco/lote.mjs novo <lote> <temas…>`. Cada etapa tem uma caixinha em
`trabalho-banco/<lote>/ESTADO.md`; para retomar, continue da primeira desmarcada.

| # | Etapa | Como | Trava se |
|---|---|---|---|
| 1 | Planejar perguntas novas | agente planejador → `plano/` | — |
| 2 | Checar o plano | `dedup.mjs <lote> plano`, depois o deduplicador → `plano-aprovado/` e parecer | — |
| 3 | Pistas dos jogadores (opcional) | `pistas.mjs <lote> <recusadas.json>` → `pistas/` | — |
| 4 | Pesquisar | perguntas novas: generica, profunda e listas; existentes: listas e revisor → `propostas/` | — |
| 5 | Consolidar | `consolidar.mjs <lote>` → `consolidado/`, `problemas.txt`, `avisos.txt`, `BASE` | `problemas.txt` não vazio bloqueia a etapa 6 |
| 6 | Auditar | agente auditor → `auditado/` (lê também `avisos.txt`) | — |
| 7 | Deduplicar | `dedup.mjs <lote> final`, depois o deduplicador → `final/` e parecer | — |
| 8 | Conferir e simular | `dedup.mjs <lote> conferir` e `aplicar.mjs <lote> --simular` | etapa incompleta ou desatualizada, alerta que bloqueia, falta de parecer, erro do validador |
| 9 | Amostra | `amostra.mjs <lote>` → o Raffael confere `amostra.md` (pode dispensar) | erro na amostra → revisar o tema inteiro |
| 10 | Aplicar | `aplicar.mjs <lote>` (backup antes e depois, fontes no `.tsv`) | banco mudou desde a etapa 5 (`BASE`), lote já aplicado (`APLICADO`), conferência falhou |
| 11 | Validar | `npm run check`, `npm test`, `npm run build` | — |
| 12 | Fechar | atualizar `ROADMAP.md`, relatar ao Raffael | — |

Detalhes por etapa:

- **Etapa 4:** cada bloco de proposta termina com a linha `# fim`. Se a sessão cair no meio de uma
  linha, o bloco sem `# fim` é acusado na consolidação. Os papéis de um tema escrevem arquivos
  separados, então podem trabalhar em paralelo.
- **Etapa 5:** o consolidador recomeça do zero a cada execução.
  - Ele só junta propostas com a **mesma canônica**. Se duas respostas diferentes dividirem uma
    variante, sai um `[FUSÃO?]` em `problemas.txt`.
  - Uma proposta que cai numa resposta existente vira variante e sai em `avisos.txt` como
    `[CONVERTIDO]`, `[NUMERAL]` ou `[JÁ EXISTE]`.
  - Remover e ampliar a mesma resposta no mesmo lote é problema. Para trocar a canônica, use `=`.
- **Etapa 7:** os alertas que bloqueiam são `[ID]`, `[VAZAMENTO]`, `[POUCAS]`, `[DUPLICADA]` e
  `[SOBREPOSIÇÃO]`.
  - Uma sobreposição só passa com a linha `MANTIDO <chave>` e a justificativa no `dedup/parecer.md`.
  - `[ESCOPO]`, `[FONTE]`, `[REMOÇÃO]` e `[TROCA]` são informativos.
- **Etapa 8:** a conferência exige:
  - os mesmos temas em `consolidado/`, `auditado/` e `final/`;
  - cada etapa mais nova que a anterior;
  - `problemas.txt` vazio;
  - `parecer.md` presente.

  A simulação roda o gerador e o validador do projeto numa cópia, e lista os pares parecidos
  envolvendo respostas novas.
- **Etapa 10:** se a validação falhar depois de aplicar, volte com
  `node scripts/banco/backup.mjs restaurar <pasta antes-de-aplicar-…> --confirmar`. O comando
  mostra o que vai ser desfeito antes de agir e regera os JSON sozinho.
- **Dois lotes no mesmo tema:** o segundo a ser aplicado trava pelo `BASE` e precisa consolidar de
  novo contra o banco atual. Prefira lotes com temas distintos.

### Critérios de uma pergunta nova (planejador e deduplicador)

- Formato "Cite um(a) …", respondível por um brasileiro comum em poucos segundos.
- **Pelo menos 25 respostas válidas com fonte** (meta: 40 ou mais), sendo umas 8 que qualquer
  pessoa lembra. Universo pequeno demais deixa a rodada sem saída; universo infinito não dá para checar.
- Universo **verificável** numa lista-fonte: lista oficial, artigo-lista da Wikipédia ou consulta ao Wikidata.
- **Não sobrepõe** pergunta existente: menos de 30% das respostas em comum, e texto que não seja a
  mesma pergunta com outras palavras.
- Nada que mude toda semana. Se for temporal, leva `@atualizadoEm AAAA-MM` e o recorte na nota.
- Nada ofensivo, adulto ou que exponha pessoa comum.
- Id com o prefixo do tema (`esp-`, `his-`, `ani-`…); o consolidador confere. Dificuldade honesta.

### Escala, paralelismo e cota

- Um lote junta de 3 a 5 temas.
- O auditor e o deduplicador cuidam de um lote inteiro, ou dividem por temas se o lote for grande.
- O orquestrador para de disparar agentes quando a cota de 5 horas passar de 70%, e retoma pelo `ESTADO.md`.

---

## Scripts (`scripts/banco/`)

| Script | Faz |
|---|---|
| `backup.mjs` | `criar` (grava numa pasta `.tmp` e só renomeia quando termina), `listar`, `comparar`, `restaurar` (prévia; `--confirmar` faz backup do atual, troca por renomeação e regera os JSON) |
| `lote.mjs` | `novo` (cria pastas e `ESTADO.md`), `estado` |
| `pistas.mjs` | transforma tentativas recusadas (2 vezes ou mais) exportadas do banco de estatísticas em pistas por pergunta |
| `consolidar.mjs` | junta propostas, descarta o que já existe, converte em variante, aponta colisões, fusões, conflitos e blocos cortados; grava `BASE` |
| `dedup.mjs` | relatórios de duplicidade (`plano`, `final`) e o portão `conferir` |
| `aplicar.mjs` | `--simular` numa cópia; aplicação real com travas, entre dois backups; registra as fontes; grava `APLICADO` |
| `amostra.mjs` | sorteia itens de `final/` para conferência humana |
| `cobertura.mjs` | perguntas e respostas por tema contra a meta |

E também `scripts/validar-perguntas.mjs`, que confere colisões, prefixos, vazamento no texto ou na
nota, nomes numerados e o mínimo de 25 respostas.

As pastas `backups/` e `trabalho-banco/` ficam fora do git, porque são locais. Já
`docs/banco/fontes-respostas/` é versionada.

---

## Histórico de decisões sobre o processo

Validação de 22/11/2026, feita por dois sub-agentes: um comparou com modelos existentes de bancos
de perguntas e curadoria, e o outro tentou quebrar o processo com cenários concretos.

**Aceito e aplicado:**
- Troca de canônica com operação própria (`=`). Antes, `x` + `+` apagava a resposta.
- Junção de propostas só pela canônica, com `[FUSÃO?]`. Antes, "Carlos X" virava variante de
  "Carlos Magno" por dividirem "Carlos".
- O relatório da simulação perdia os pares parecidos, que iam para a saída de erro.
- Portão `conferir`, para impedir que um `final/` parcial ou desatualizado aplique meio lote.
- Travas `BASE` (banco mudou) e `APLICADO` (reaplicação).
- `[NUMERAL]` na consolidação e regra de números no validador.
- Vazamento no texto ou na nota pelas regras do jogo (prefixo e erro de digitação). Isso corrigiu
  7 textos existentes: "vilão" entregava Visão, "corpo" entregava Carpo, "banheiro" entregava
  Banheira, "graduação" entregava Tradução e outros.
- `--` estrito, `# fim` por bloco e bloco repetido acusado.
- Backup atômico; restauração com prévia, `--confirmar` e troca por renomeação; JSON regerados.
- Id de pergunta nova checado no banco inteiro e com o prefixo do tema.
- Normalização do "&" igual no validador e no jogo.
- O consolidador recomeça do zero; conflito entre `x` e `~` é acusado.
- O `+` não entra depois de comentários soltos.
- Fontes versionadas em `docs/banco/fontes-respostas/` (antes ficavam só no backup local).
- Pistas dos jogadores (`pistas.mjs`), para quando o banco de estatísticas (D1) estiver ativo.
- Amostra para conferência humana (`amostra.mjs`), porque todos os agentes rodam no mesmo modelo
  e tendem a concordar entre si.
- Wikidata como conferência de listas fechadas no papel "listas".
- Para perguntas existentes, só "listas" e o revisor; os três pesquisadores ficam para perguntas novas.
- Removida a etapa de backup manual inicial (o `aplicar.mjs` já faz backup antes e depois).

**Não aplicado, com motivo:**
- *Tirar o agente deduplicador da etapa 2.* O Raffael pediu um agente dedicado a comparar tudo o
  que foi criado com o banco. Mantido, mas com decisão escrita obrigatória só para o que bloqueia.
- *Botão "contestar resposta" no jogo.* Mexe no jogo, não no processo; fica como sugestão.
- *Auditor de outra família de modelo.* Não está disponível; a amostra humana cobre esse risco.
- *Hash do arquivo de entrada em cada etapa.* A data de modificação somada à conferência dos temas
  cobre os casos reais com menos atrito para os agentes.
