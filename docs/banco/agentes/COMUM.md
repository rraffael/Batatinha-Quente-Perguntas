# Regras comuns a todos os agentes do banco

Leia antes do briefing do seu papel. Contexto: "Batatá Quentá" é um jogo de batata quente de
perguntas em português do Brasil. Cada pergunta pede "Cite um X", os jogadores digitam respostas e
o jogo reconhece a resposta ignorando acentos, maiúsculas e pontuação. Também tolera prefixo
(digitar pelo menos 80% de uma forma) e um erro de digitação (dois, em palavras com 9 letras ou mais).
Traduções (inglês e espanhol) só valem digitadas exatamente.

## Obrigatório

1. Leia `docs/banco/PROCESSO.md` (seção Princípios) e `docs/banco/FORMATO.md`.
2. **Fonte para tudo.** Cada item que você propõe leva uma URL que o comprove; verifique com
   WebSearch e WebFetch. Não crie nada sem embasamento. Se não achar fonte, não proponha.
3. **Na dúvida, não proponha (ou rejeite).** Uma resposta errada é pior que dez em falta.
4. **Nada ofensivo, adulto ou palavrão.**
5. **Escreva só nos arquivos do seu papel**, dentro de `trabalho-banco/<lote>/`. As fontes do banco
   (`scripts/fontes/`) são só para leitura.
6. **Não leia nem escreva fora de** `D:\Projeto Pessoal\Batatinha-Quente-Perguntas`. Não rode
   `git`, `npm` nem `npx`. Você pode rodar `node scripts/banco/*.mjs` e `node scripts/validar-perguntas.mjs`.
7. **Grave aos poucos**, pergunta a pergunta, acrescentando no fim do arquivo, para não perder trabalho
   se a sessão cair. **Feche cada bloco com a linha `# fim`.** Se o arquivo já existir, continue de onde
   ele parou, sem repetir; se o último bloco não tiver `# fim`, refaça esse bloco inteiro.
8. Ao terminar, responda com um resumo curto: contagens por tema, dúvidas e o que precisa de decisão humana.

## Armadilhas que já aconteceram

- **Variante genérica** que vira outra resposta: "Rio" para um rio específico, "Gabinete" para "Armário".
- **Prefixo perigoso:** "Pulga" é 83% de "Pulgão". Se as duas valem, ambas precisam existir como
  respostas; se uma é variante da outra, não pode.
- **Mesma pessoa com outro nome:** apelido, nome artístico, nome completo e nome de nascimento são
  variantes da mesma resposta, não respostas novas.
- **Número romano:** governantes ou pessoas de mesmo nome que só diferem pelo número são uma
  resposta só; obras e produtos numerados são respostas separadas.
- **Nome que aparece no texto da pergunta:** em "Cite um personagem de Naruto", o próprio Naruto
  seria resposta de graça; isso é proibido. Vale também para palavras parecidas: "vilão" no texto
  casaria com "Visão" por erro de digitação.
- **Juntar coisas diferentes por uma variante em comum:** "Carlos" não pode ser variante de Carlos
  Magno e de Carlos X ao mesmo tempo. Variante ambígua não entra em nenhuma das duas.
- **Categoria "quase":** revolta que não foi guerra, governante que não foi faraó, marca que não é do
  ramo, artista que não é brasileiro.
- **Coisa temporal:** nome atual de estádio, elenco, cargo ocupado hoje. Só entra se a pergunta tiver `@atualizadoEm`.
