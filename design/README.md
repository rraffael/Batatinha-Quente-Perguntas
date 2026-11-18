# Batatinha Quente — guia visual

## Conceito: "Roda na Mata"

Fim de tarde numa clareira da mata. Os seres do folclore sentam em roda em volta de uma
fogueirinha, e no meio está a pergunta. A batata foi esquentada no fogo do **Boitatá** e
ninguém quer ficar com ela: quem responde passa adiante. Quando o pavio acaba: **POF!**
O clima é de **festa e brincadeira entre amigos**, sem terror: os "monstros" são simpáticos,
redondos e sorridentes.

- Cores quentes (urucum, mata, chama), papel claro de dia e noite escura no tema escuro.
- Nada de oceano, azul-turquesa como cor principal nem baiacu (fica longe do krillion.io).
- Layout próprio: a roda é um círculo de assentos em volta de uma clareira, e o input fica grande
  e fixo embaixo.

## Paleta (tokens em `tokens.css`)

| Token | Claro | Escuro | Uso / contraste |
|---|---|---|---|
| `--c-bg` | `#fbf3e4` | `#15130f` | fundo |
| `--c-surface` | `#ffffff` | `#231e18` | cartões |
| `--c-text` | `#2a1d14` | `#f6ebdd` | texto (14.6:1 / 16:1) |
| `--c-text-muted` | `#6b5443` | `#c4b19a` | texto secundário (6.6:1 / 9:1) |
| `--c-primary` | `#b8431a` | `#c9501f` | urucum, ação principal (branco 5.4:1 / 4.5:1) |
| `--c-secondary` | `#2f6b3a` | `#3c8049` | mata, ação secundária (branco 6.4:1 / 4.8:1) |
| `--c-accent` | `#f2b705` | igual | chama/ouro, sempre com texto escuro (9:1) |
| `--c-danger` | `#b3261e` | `#ff8a7f` | erro, "não reconhecida" |

Todos os pares de texto foram calculados para atingir **WCAG AA** (≥ 4.5:1). O foco usa um anel
duplo (`--focus-ring`), visível nos dois temas. O tema segue `prefers-color-scheme` e pode ser
forçado com `data-theme="light|dark"` no `<html>`.

## Raridades

| Raridade | Fundo | Texto | Contraste |
|---|---|---|---|
| Comum | `#6b6b6b` cinza-pedra | branco | 5.3:1 |
| Incomum | `#2e7d32` verde-mata | branco | 5.1:1 |
| Raro | `#1e5fb4` azul-rio | branco | 6.3:1 |
| Épico | `#7b3fb0` roxo-noite | branco | 6.6:1 |
| Lendário | `#f2b705` ouro-chama | `#2a1d14` | 9.0:1, com brilho (`--r-lendario-glow`) |

O selo sempre traz o **nome escrito**, não só a cor, por causa do daltonismo.

## Tipografia

- **Baloo 2** (SIL OFL): títulos, botões, pergunta e código da sala. Arredondada e festiva.
- **Nunito** (SIL OFL): texto corrido, inputs e listas.
- **Empacotar localmente** em `/fonts/*.woff2` (o `@font-face` em `tokens.css` já aponta para
  `../fonts/`). **Não usar CDN/Google Fonts**, porque o Discord bloqueia. Se faltar, o fallback é
  Trebuchet/Segoe UI.
- O input da resposta tem **≥ 16px** (`--fs-input` = 22px), o que evita o zoom automático do iOS.

## Tom de voz

Português brasileiro informal, curto, caloroso e brincalhão, sem humilhar quem erra.

- Ação principal: "Acender o pavio!", "Passar!", "Jogar de novo", "Sair da roda".
- Repetida: **"'Portugal' já foi usada!"**. Desconhecida: **"Hmm, não conheço 'Xyz'"**.
- Estouro: **"POF! Fulano perdeu uma vida"**. Eliminado: "Fulano saiu da roda".
- Espera: "Esperando o host acender o pavio…", "Fulano está com a batata…".
- **Nunca** mostrar o tempo restante do pavio (nem por texto, nem por barra).

## Animação

| Evento | Regra |
|---|---|
| Passe da batata | voa até o próximo assento em `--dur-pass` (380ms), girando 360°, com `--ease-out`. Ela fica a ~1/3 do caminho entre o jogador e o centro. |
| Segurando | balanço leve e contínuo (`wobble`, 900ms). O assento de quem segura ganha um anel laranja. |
| Esquentando | a arte `batata-esquentando.svg` pode trocar de forma **aleatória/cosmética**. **Nunca** atrelar ao tempo real do pavio, senão ele deixa de ser oculto. |
| Estouro | troca para `batata-estourando.svg`, escala 0.6 → 1.8 → 2.1 e some em `--dur-boom` (700ms). O assento treme por 420ms, um coração some e a batata renasce normal no próximo jogador. |
| Resposta aceita | o selo de raridade entra no histórico. O Lendário tem brilho dourado (opcional: um pulso). |
| Telas | fade + subida de 8px em 240ms. |
| `prefers-reduced-motion` | todas as durações vão a 0 (já definido nos tokens). |

## Layout e anúncio

- Desktop: a coluna de conteúdo (até 1080px) e o **slot de anúncio de 300px** à direita.
- Mobile (≤ 900px): o anúncio vira **rodapé fixo de 60px**.
- **Na tela de Partida o slot some** (`body[data-screen="partida"] .ad-slot { display:none }`).
- Teclado no celular: `interactive-widget=resizes-content` no viewport e a barra de resposta em
  `position: sticky; bottom: 0`, com o input sempre visível acima do teclado. No Preact, se o iOS
  não redimensionar, usar `visualViewport.height` para ajustar o padding inferior.

## Personagens (`personagens/*.svg`, 64×64, legíveis a 48px)

| Arquivo | Ficha |
|---|---|
| `saci.svg` | **Saci**: menino travesso de uma perna só e gorro vermelho, que vive nos redemoinhos de vento (folclore do Sudeste/Sul). Aqui ele aparece sem cachimbo e com traços respeitosos. |
| `curupira.svg` | **Curupira**: protetor das matas, de cabelo de fogo e pés virados para trás para confundir caçadores (registrado desde o séc. XVI). |
| `iara.svg` | **Iara**: a "mãe d'água" dos rios amazônicos, que encanta com seu canto. Aqui é retratada como guardiã do rio, com uma flor d'água. |
| `boitata.svg` | **Boitatá**: a cobra de fogo que protege os campos contra queimadas. É a dona do fogo que esquenta a batata. |
| `mula-sem-cabeca.svg` | **Mula sem cabeça**: mula que galopa soltando fogo pelo pescoço, com ferraduras barulhentas (lenda rural de todo o país). |
| `boto.svg` | **Boto**: o boto-cor-de-rosa do Amazonas, que nas noites de festa aparece de chapéu branco. Versão infantil: um boto sorridente de chapéu. |
| `mapinguari.svg` | **Mapinguari**: gigante peludo da Amazônia, de um olho só e boca na barriga. Aqui é fofo e desajeitado. |
| `cuca.svg` | **Cuca**: velha bruxa das cantigas de ninar ("dorme neném…"). Vovó de xale roxo, coque e óculos sob a lua. **Não é jacaré.** |
| `lobisomem.svg` | **Lobisomem**: homem que vira lobo nas noites de lua cheia (tradição ibérica abrasileirada). |
| `caipora.svg` | **Caipora**: protetora dos bichos da mata, montada num porco-do-mato (cateto). Tem cabelo cheio, folhas e o focinho do cateto. |
| `batata.svg` / `batata-esquentando.svg` / `batata-estourando.svg` | os três estados da batata. |

## Cuidados (checklist para novas artes)

- Arte 100% original. Não imitar Sítio do Picapau Amarelo (Cuca jacaré, Saci da TV), Turma do
  Pererê, Turma da Mônica, *Cidade Invisível* nem krillion.io.
- Saci com dignidade: proporções normais, sem exagero de traços e sem cachimbo.
- Iara sem sexualização: só o busto/rosto, cabelo cobrindo.
- Sem grafismos, cocares ou objetos sagrados de povos indígenas específicos. Use só natureza
  (folhas, flores, fogo, água).
- Boto em versão infantil (o animal de chapéu, não o "sedutor").
- Assustador nunca, travesso sempre.
