# ROADMAP — Banco de perguntas do Batatá Quentá

Acompanhamento da arquitetura de incremento do banco (perguntas e respostas) e da expansão para
**pelo menos 15 perguntas por tema**. Marque cada item conforme for concluído: `[ ]` → `[x]`.

**Legenda de status das fases:** ⬜ Não iniciada · 🟡 Em andamento · ✅ Concluída

> **Para retomar depois de uma pausa:** leia este arquivo, depois `docs/banco/PROCESSO.md`, e
> continue do primeiro item desmarcado. O lote em andamento fica em `trabalho-banco/<lote>/` e o
> arquivo `trabalho-banco/<lote>/ESTADO.md` diz em que etapa ele parou.

---

## Estado atual (24/11/2026)

**Funcional:**
- Processo de incremento pronto e validado: `docs/banco/PROCESSO.md`, scripts em `scripts/banco/`, backups em `backups/banco/`.
- Banco com 20 temas, 157 perguntas e 15.241 respostas, compilado a partir de `scripts/fontes/<tema>.txt`.
- Validador (`scripts/validar-perguntas.mjs`): colisões, prefixos ambíguos (com lista revisada em
  `scripts/prefixos-revisados.txt`) e textos ou notas que revelam respostas.
- Algarismos gerados automaticamente a partir de números romanos ("Ramsés II" → "Ramsés 2").
- Testes do banco: toda forma casa com a própria resposta; nomes numerados caem na resposta certa.
- Revisão de respostas faltantes já feita uma vez (pasta temporária `revisao-respostas/`).

**Incompleto:**
- O processo da revisão anterior existia só em arquivos temporários: briefings em `revisao-respostas/`
  e scripts no rascunho da sessão. Nada disso é reaproveitável sem ser recriado.
- O processo não cobria **perguntas novas**, só respostas novas.

**Faltando:**
- Backup versionado do banco com restauração.
- Processo documentado e permanente no repositório (briefings dos agentes e scripts).
- Etapa de deduplicação dedicada, que compara tudo o que foi criado com o banco atual.
- Validação externa do processo (comparação com modelos existentes e testes de estresse).
- Perguntas suficientes: 17 temas ainda abaixo de 15 (faltam 143 perguntas no total; lote 1 aplicado).

---

## Fase 1 — Roadmap ✅
Ponto de retomada quando a sessão for interrompida.

- [x] Criar `ROADMAP.md` com fases, metas por tema e instrução de retomada

## Fase 2 — Backup versionado ✅
Pré-requisito de tudo: nenhuma alteração grande no banco sem um ponto de volta.

- [x] `scripts/banco/backup.mjs criar "<rótulo>"`: copia `scripts/fontes/`, `data/perguntas/` e
  `scripts/prefixos-revisados.txt` para `backups/banco/<AAAA-MM-DD_HHMM>_<rótulo>/`, com um `MANIFESTO.json` (contagens e hash)
- [x] `backup.mjs listar` e `backup.mjs restaurar <pasta>`; a restauração faz um backup automático do estado atual antes
- [x] `backup.mjs comparar <pasta>`: diferença em perguntas e respostas entre o backup e o banco atual
- [x] Incluir `backups/` e `trabalho-banco/` no `.gitignore`
- [x] Criar o primeiro backup ("antes-da-arquitetura")

## Fase 3 — Processo documentado ✅
O modelo usado na revisão anterior, agora permanente e cobrindo perguntas novas.

- [x] `docs/banco/PROCESSO.md`: etapas, quem faz o quê, formatos, regras de ouro e critérios de parada
- [x] `docs/banco/FORMATO.md`: formato das propostas (pergunta nova, resposta nova, variante, rejeição) com fonte obrigatória
- [x] Briefing de cada papel em `docs/banco/agentes/`:
  - [x] `planejador.md`: propõe perguntas novas com escopo fechado, lista-fonte e anti-sobreposição
  - [x] `pesquisador.md`: preenche respostas (papéis genérico, profundo e listas), sempre com fonte
  - [x] `revisor-existentes.md`: procura erros, ambiguidades e respostas faltando no que já existe
  - [x] `auditor.md`: aprova ou rejeita cada item (fato, categoria, variantes, raridade, nota sem resposta)
  - [x] `deduplicador.md`: compara tudo o que foi criado com o banco atual, para nunca haver conteúdo duplicado

## Fase 4 — Scripts do processo ✅
Automatiza o que não precisa de julgamento, para que os agentes só façam o que exige pesquisa.

- [x] `scripts/banco/lote.mjs novo <nome>`: cria `trabalho-banco/<lote>/` com subpastas e `ESTADO.md`
- [x] `scripts/banco/consolidar.mjs`: junta propostas, descarta duplicatas exatas e marca colisões com o banco
- [x] `scripts/banco/dedup.mjs`: relatório determinístico de sobreposição (perguntas parecidas entre si, respostas repetidas, formas em conflito)
- [x] `scripts/banco/aplicar.mjs`: aplica só o que está aprovado (perguntas novas, respostas novas, variantes) e retira as fontes das linhas
- [x] `scripts/banco/cobertura.mjs`: perguntas por tema contra a meta de 15
- [x] Testar o fluxo completo com um lote de ensaio (simulação, aplicação real e restauração idêntica; lote e backups de ensaio apagados)

## Fase 5 — Validação do processo por 2 sub-agentes ✅
Segunda opinião antes de usar o processo em escala.

- [x] Sub-agente 1: pesquisar modelos existentes de bancos de perguntas e respostas (jogos de quiz, curadoria colaborativa, controle editorial) e comparar com o nosso
- [x] Sub-agente 2: tentar "quebrar" o processo com situações hipotéticas concretas
- [x] Aplicar os ajustes aceitos e registrar os rejeitados com motivo em `docs/banco/PROCESSO.md`
- [x] Ajustes extras surgidos na validação: 7 textos de perguntas reescritos (vazamento por erro de digitação/prefixo), validador com regra de nomes numerados

## Fase 6 — Expansão: pelo menos 15 perguntas por tema 🟡
Feita em lotes, sempre com backup → planejamento → pesquisa → auditoria → deduplicação → aplicação → validação.

| Tema | Hoje | Meta | Faltam |
|---|---|---|---|
| animais | 7 | 15 | 8 |
| anime-desenho | 7 | 15 | 8 |
| ciencia | 6 | 15 | 9 |
| cinema-tv | 6 | 15 | 9 |
| comida-bebida | 8 | 15 | 7 |
| corpo-saude | 6 | 15 | 9 |
| esportes | 15 | 15 | 0 |
| exterior | 15 | 15 | 0 |
| futebol-br | 6 | 15 | 9 |
| games | 6 | 15 | 9 |
| geografia | 8 | 15 | 7 |
| historia | 15 | 15 | 0 |
| lingua-portuguesa | 7 | 15 | 8 |
| marcas-empresas | 6 | 15 | 9 |
| mitologia-religiao | 7 | 15 | 8 |
| musica-br | 7 | 15 | 8 |
| musica-internacional | 6 | 15 | 9 |
| novelas-tv-br | 6 | 15 | 9 |
| objetos-casa | 7 | 15 | 8 |
| profissoes | 6 | 15 | 9 |
| **Total** | **157** | **300** | **143** |

- [x] Lote 1: esportes, exterior, historia (aplicado em 24/11/2026: +32 perguntas, +2.866 respostas, com revisão das existentes)
- [ ] Lote 2: ciencia, cinema-tv, corpo-saude, futebol-br
- [ ] Lote 3: games, marcas-empresas, musica-internacional, novelas-tv-br, profissoes
- [ ] Lote 4: animais, anime-desenho, lingua-portuguesa, mitologia-religiao
- [ ] Lote 5: musica-br, objetos-casa, comida-bebida, geografia
- [ ] Revisão das respostas existentes dos temas de cada lote (erros, ambiguidades e faltas), no mesmo lote

## Fase 7 — Fechamento ⬜

- [ ] `npm run check`, `npm test`, `npm run build` e validador sem erros
- [x] Atualizar `CLAUDE.md` com o processo (link para `docs/banco/PROCESSO.md`)
- [ ] Sugerir ao Raffael os comandos de commit e a remoção de `revisao-respostas/`

---

## Ordem recomendada

1. Fase 2 (backup) antes de qualquer outra alteração no banco.
2. Fases 3 e 4 juntas: os briefings citam os scripts e vice-versa.
3. Fase 5 só com as fases 3 e 4 prontas; os ajustes dela entram antes da Fase 6.
4. Fase 6 lote a lote: cada lote termina com o banco validado e um backup, para retomar com segurança.
   Os temas de um mesmo lote podem ser pesquisados em paralelo; a deduplicação e a aplicação são sempre sequenciais.
